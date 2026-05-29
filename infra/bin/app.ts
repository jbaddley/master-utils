#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { ImageToolsStack } from "../lib/image-tools-stack";

const app = new cdk.App();

new ImageToolsStack(app, "ImageToolsStack", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region:  process.env.CDK_DEFAULT_REGION ?? "us-east-1",
  },
  // Adjust to match your domain + ACM cert ARN
  domainName:  process.env.DOMAIN_NAME,
  certArn:     process.env.ACM_CERT_ARN,
  // EC2 GPU tier for Ollama: "g4dn.xlarge" | "g5.xlarge" | "g5.2xlarge"
  ollamaInstanceType: (process.env.OLLAMA_INSTANCE_TYPE ?? "g5.xlarge") as
    | "g4dn.xlarge"
    | "g5.xlarge"
    | "g5.2xlarge",
  // ECR repo URI — build + push your Docker image here first
  ecrImageUri: process.env.ECR_IMAGE_URI ?? "",
});
