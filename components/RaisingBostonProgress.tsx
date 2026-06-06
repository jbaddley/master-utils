import {
  formatUsd,
  getRaisingBostonProgress,
  GOAL_CENTS,
  PUBLISHING_BUDGET,
} from "@/lib/raising-boston";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export async function RaisingBostonProgress() {
  const progress = await getRaisingBostonProgress();

  return (
    <section className="raising-boston-progress" aria-labelledby="publishing-goal">
      <h2 id="publishing-goal">Publishing goal</h2>
      <p className="lede">
        We need {formatUsd(GOAL_CENTS)} to publish <em>Raising Boston</em> independently
        — hiring a professional editor, cover artist, and audiobook narrator.
      </p>

      <div className="raising-boston-progress-summary">
        <div className="raising-boston-progress-stats">
          <span>
            <strong>{formatUsd(progress.raisedCents)}</strong> raised
          </span>
          <span aria-hidden="true">·</span>
          <span>{formatUsd(progress.remainingCents)} remaining</span>
          <span aria-hidden="true">·</span>
          <span>{progress.percent}% of goal</span>
        </div>
        <div
          className="raising-boston-progress-bar"
          role="progressbar"
          aria-valuenow={progress.percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Fundraising progress toward publishing goal"
        >
          <div
            className="raising-boston-progress-bar-fill"
            style={{ width: `${progress.percent}%` }}
          />
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Line item</TableHead>
            <TableHead className="text-right">Budget</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {PUBLISHING_BUDGET.map(({ item, budgetCents }) => (
            <TableRow key={item}>
              <TableCell>{item}</TableCell>
              <TableCell className="text-right">{formatUsd(budgetCents)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell>Total goal</TableCell>
            <TableCell className="text-right">{formatUsd(GOAL_CENTS)}</TableCell>
          </TableRow>
        </TableFooter>
      </Table>

      {progress.recentDonations.length > 0 && (
        <div className="raising-boston-recent">
          <h3>Recent support</h3>
          <ul>
            {progress.recentDonations.map((donation, i) => (
              <li key={`${donation.createdAt.toISOString()}-${i}`}>
                {formatUsd(donation.amountCents)} —{" "}
                {donation.createdAt.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
