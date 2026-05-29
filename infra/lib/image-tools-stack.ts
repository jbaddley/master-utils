import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as ecr from "aws-cdk-lib/aws-ecr";
import * as elbv2 from "aws-cdk-lib/aws-elasticloadbalancingv2";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import * as logs from "aws-cdk-lib/aws-logs";
import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";

export interface ImageToolsStackProps extends cdk.StackProps {
  /** Your domain, e.g. "tools.example.com". Optional — skips CloudFront cert if omitted. */
  domainName?: string;
  /** ACM certificate ARN (must be in us-east-1 for CloudFront). */
  certArn?: string;
  /** EC2 instance type for the Ollama GPU server. */
  ollamaInstanceType: "g4dn.xlarge" | "g5.xlarge" | "g5.2xlarge";
  /** ECR image URI for the Next.js app, e.g. 123456789.dkr.ecr.us-east-1.amazonaws.com/image-tools:latest */
  ecrImageUri: string;
}

export class ImageToolsStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: ImageToolsStackProps) {
    super(scope, id, props);

    // ── VPC ─────────────────────────────────────────────────────────────────
    const vpc = new ec2.Vpc(this, "Vpc", {
      maxAzs: 2,
      natGateways: 1,
      subnetConfiguration: [
        { name: "Public",  subnetType: ec2.SubnetType.PUBLIC,           cidrMask: 24 },
        { name: "Private", subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS, cidrMask: 24 },
      ],
    });

    // ── Security Groups ─────────────────────────────────────────────────────

    // Ollama EC2: only reachable from within VPC on port 11434
    const ollamaSg = new ec2.SecurityGroup(this, "OllamaSg", {
      vpc,
      description: "Ollama GPU server — internal VPC only",
      allowAllOutbound: true,
    });

    // ECS tasks: outbound + inbound from ALB
    const ecsSg = new ec2.SecurityGroup(this, "EcsSg", {
      vpc,
      description: "ECS Fargate tasks",
      allowAllOutbound: true,
    });

    // Allow ECS → Ollama on 11434
    ollamaSg.addIngressRule(ecsSg, ec2.Port.tcp(11434), "ECS tasks → Ollama");

    // ── EC2 GPU — Ollama ────────────────────────────────────────────────────
    const ollamaRole = new iam.Role(this, "OllamaRole", {
      assumedBy: new iam.ServicePrincipal("ec2.amazonaws.com"),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonSSMManagedInstanceCore"),
      ],
    });

    // UserData installs NVIDIA drivers, Ollama, and pulls starter models
    const userData = ec2.UserData.forLinux();
    userData.addCommands(
      "#!/bin/bash",
      "set -euo pipefail",
      "",
      "# ── NVIDIA drivers (AL2023) ──────────────────────────────────────────",
      "dnf install -y kernel-devel-$(uname -r) gcc make dkms",
      "dnf config-manager --add-repo https://developer.download.nvidia.com/compute/cuda/repos/rhel9/x86_64/cuda-rhel9.repo",
      "dnf install -y cuda-driver",
      "modprobe nvidia",
      "",
      "# ── Ollama ───────────────────────────────────────────────────────────",
      "curl -fsSL https://ollama.com/install.sh | sh",
      "",
      "# Configure Ollama to listen on all interfaces (VPC-internal only via SG)",
      "mkdir -p /etc/systemd/system/ollama.service.d",
      "cat > /etc/systemd/system/ollama.service.d/override.conf << 'EOF'",
      "[Service]",
      "Environment=OLLAMA_HOST=0.0.0.0:11434",
      "EOF",
      "systemctl daemon-reload",
      "systemctl enable --now ollama",
      "",
      "# ── Pull default models (runs in background after boot) ──────────────",
      "cat > /usr/local/bin/pull-models.sh << 'EOF'",
      "#!/bin/bash",
      "sleep 30  # wait for Ollama to start",
      "ollama pull llama3.1:8b",
      "ollama pull mistral",
      "ollama pull phi4",
      "ollama pull qwen2.5",
      "ollama pull codellama",
      "EOF",
      "chmod +x /usr/local/bin/pull-models.sh",
      "nohup /usr/local/bin/pull-models.sh > /var/log/ollama-pull.log 2>&1 &",
    );

    const ollamaInstance = new ec2.Instance(this, "OllamaServer", {
      vpc,
      vpcSubnets:       { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      securityGroup:    ollamaSg,
      role:             ollamaRole,
      instanceType:     new ec2.InstanceType(props.ollamaInstanceType),
      // Amazon Linux 2023 — use a Deep Learning AMI for pre-installed CUDA drivers
      // Deep Learning Base AMI (Amazon Linux 2023) — us-east-1
      machineImage:     ec2.MachineImage.latestAmazonLinux2023({
        cachedInContext: true,
      }),
      userData,
      blockDevices: [
        {
          deviceName: "/dev/xvda",
          volume: ec2.BlockDeviceVolume.ebs(100, { // 100 GB for models
            volumeType: ec2.EbsDeviceVolumeType.GP3,
          }),
        },
      ],
    });

    // Tag for easy identification
    cdk.Tags.of(ollamaInstance).add("Role", "ollama-gpu");

    // ── Secrets Manager ─────────────────────────────────────────────────────
    const appSecrets = new secretsmanager.Secret(this, "AppSecrets", {
      secretName: "image-tools/env",
      description: "Environment variables for the image-tools Next.js app",
      generateSecretString: {
        secretStringTemplate: JSON.stringify({
          LLM_API_KEY:         "ollama",
          LLM_DEFAULT_MODEL:   "llama3.1:8b",
          NEXT_PUBLIC_LLM_MODE: "server",
        }),
        generateStringKey: "_unused", // required by CDK even when not using auto-gen
      },
    });

    // ── ECS Cluster ──────────────────────────────────────────────────────────
    const cluster = new ecs.Cluster(this, "Cluster", {
      vpc,
      containerInsights: true,
    });

    // ── Task Definition ─────────────────────────────────────────────────────
    const taskRole = new iam.Role(this, "TaskRole", {
      assumedBy: new iam.ServicePrincipal("ecs-tasks.amazonaws.com"),
    });
    appSecrets.grantRead(taskRole);

    const executionRole = new iam.Role(this, "ExecutionRole", {
      assumedBy: new iam.ServicePrincipal("ecs-tasks.amazonaws.com"),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName("service-role/AmazonECSTaskExecutionRolePolicy"),
      ],
    });
    appSecrets.grantRead(executionRole);

    const logGroup = new logs.LogGroup(this, "AppLogs", {
      logGroupName:  "/ecs/image-tools",
      retention:     logs.RetentionDays.TWO_WEEKS,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const taskDef = new ecs.FargateTaskDefinition(this, "TaskDef", {
      cpu:            2048,
      memoryLimitMiB: 4096,
      taskRole,
      executionRole,
    });

    const ollamaPrivateDns = ollamaInstance.instancePrivateDnsName;

    taskDef.addContainer("NextJs", {
      image: ecs.ContainerImage.fromRegistry(props.ecrImageUri || "node:22-alpine"),
      portMappings: [{ containerPort: 3000 }],
      environment: {
        NODE_ENV:       "production",
        LLM_BASE_URL:   `http://${ollamaPrivateDns}:11434/v1`,
        NEXT_TELEMETRY_DISABLED: "1",
      },
      secrets: {
        LLM_API_KEY:          ecs.Secret.fromSecretsManager(appSecrets, "LLM_API_KEY"),
        LLM_DEFAULT_MODEL:    ecs.Secret.fromSecretsManager(appSecrets, "LLM_DEFAULT_MODEL"),
        NEXT_PUBLIC_LLM_MODE: ecs.Secret.fromSecretsManager(appSecrets, "NEXT_PUBLIC_LLM_MODE"),
      },
      logging: ecs.LogDrivers.awsLogs({
        logGroup,
        streamPrefix: "nextjs",
      }),
      healthCheck: {
        command: ["CMD-SHELL", "curl -f http://localhost:3000/ || exit 1"],
        interval: cdk.Duration.seconds(30),
        timeout:  cdk.Duration.seconds(5),
        retries:  3,
      },
    });

    // ── ALB ─────────────────────────────────────────────────────────────────
    const albSg = new ec2.SecurityGroup(this, "AlbSg", {
      vpc,
      description: "ALB — allow inbound HTTP/HTTPS",
      allowAllOutbound: true,
    });
    albSg.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80),  "HTTP");
    albSg.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(443), "HTTPS");
    ecsSg.addIngressRule(albSg, ec2.Port.tcp(3000), "ALB → Next.js");

    const alb = new elbv2.ApplicationLoadBalancer(this, "Alb", {
      vpc,
      internetFacing:  true,
      securityGroup:   albSg,
    });

    const targetGroup = new elbv2.ApplicationTargetGroup(this, "Tg", {
      vpc,
      port:            3000,
      protocol:        elbv2.ApplicationProtocol.HTTP,
      targetType:      elbv2.TargetType.IP,
      healthCheck: {
        path:                 "/",
        healthyHttpCodes:     "200-299",
        interval:             cdk.Duration.seconds(30),
        timeout:              cdk.Duration.seconds(10),
        healthyThresholdCount:   2,
        unhealthyThresholdCount: 3,
      },
    });

    // HTTP listener — redirect to HTTPS if cert is provided, else forward
    const httpListener = alb.addListener("HttpListener", {
      port: 80,
      defaultAction: props.certArn
        ? elbv2.ListenerAction.redirect({ protocol: "HTTPS", port: "443", permanent: true })
        : elbv2.ListenerAction.forward([targetGroup]),
    });

    if (props.certArn) {
      alb.addListener("HttpsListener", {
        port:         443,
        certificates: [elbv2.ListenerCertificate.fromArn(props.certArn)],
        defaultTargetGroups: [targetGroup],
      });
    }

    // ── ECS Service ─────────────────────────────────────────────────────────
    const service = new ecs.FargateService(this, "Service", {
      cluster,
      taskDefinition: taskDef,
      desiredCount:   2,
      vpcSubnets:     { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      securityGroups: [ecsSg],
      assignPublicIp: false,
    });

    service.attachToApplicationTargetGroup(targetGroup);

    // Auto-scaling: 2–8 tasks, scale on 70% CPU
    const scaling = service.autoScaleTaskCount({ minCapacity: 2, maxCapacity: 8 });
    scaling.scaleOnCpuUtilization("CpuScaling", {
      targetUtilizationPercent: 70,
      scaleInCooldown:  cdk.Duration.seconds(60),
      scaleOutCooldown: cdk.Duration.seconds(60),
    });

    // ── CloudFront ──────────────────────────────────────────────────────────
    const cert = props.certArn
      ? acm.Certificate.fromCertificateArn(this, "Cert", props.certArn)
      : undefined;

    const distribution = new cloudfront.Distribution(this, "Cdn", {
      defaultBehavior: {
        origin: new origins.LoadBalancerV2Origin(alb, {
          protocolPolicy: cloudfront.OriginProtocolPolicy.HTTP_ONLY,
        }),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy:          cloudfront.CachePolicy.CACHING_DISABLED, // Next.js handles its own caching
        allowedMethods:       cloudfront.AllowedMethods.ALLOW_ALL,
        originRequestPolicy:  cloudfront.OriginRequestPolicy.ALL_VIEWER,
      },
      additionalBehaviors: {
        // Cache static Next.js assets aggressively
        "/_next/static/*": {
          origin: new origins.LoadBalancerV2Origin(alb, {
            protocolPolicy: cloudfront.OriginProtocolPolicy.HTTP_ONLY,
          }),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy:          cloudfront.CachePolicy.CACHING_OPTIMIZED,
        },
      },
      ...(cert && props.domainName
        ? {
            domainNames: [props.domainName],
            certificate: cert,
          }
        : {}),
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100, // US, Canada, Europe
    });

    // ── Outputs ─────────────────────────────────────────────────────────────
    new cdk.CfnOutput(this, "CloudFrontUrl", {
      value:       `https://${distribution.distributionDomainName}`,
      description: "CloudFront distribution URL",
    });

    new cdk.CfnOutput(this, "AlbDns", {
      value:       alb.loadBalancerDnsName,
      description: "ALB DNS name (origin for CloudFront)",
    });

    new cdk.CfnOutput(this, "OllamaPrivateDns", {
      value:       ollamaPrivateDns,
      description: "Ollama EC2 private DNS — set as LLM_BASE_URL host",
    });

    new cdk.CfnOutput(this, "AppSecretsArn", {
      value:       appSecrets.secretArn,
      description: "Secrets Manager ARN — update LLM_API_KEY etc. here",
    });

    // Suppress cfn_nag rules for demo purposes
    if (!props.certArn) {
      const cfnListener = httpListener.node.defaultChild as cdk.CfnResource;
      cfnListener.addMetadata("cfn_nag", {
        rules_to_suppress: [{ id: "W56", reason: "No cert provided — HTTP only for dev" }],
      });
    }
  }
}
