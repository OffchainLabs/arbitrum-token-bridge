import { FlowResult, Result } from "lighthouse";

type Metric = {
  /** Number from 0 to 1 */
  score: number;
  numericValue: number;
};
export type NavigationResult = {
  fcp: Metric;
  lcp: Metric;
  tbt: Metric;
  cls: Metric;
  speed: Metric;
  performance: number;
  accessibility: number;
  best_practices: number;
  seo: number;
};
export type TimespanResult = {
  performance: number;
  tbt: Metric;
  cls: Metric;
  inp: Metric;
  best_practices: number;
  longTasks: {
    total: number;
    durationMs: number;
  };
};
export type SnapshotResult = {
  performance: number;
  accessibility: number;
  best_practices: number;
  seo: number;
};

function parse(result: FlowResult.Step, metricName: string): Metric {
  const metric = result.lhr.audits[metricName];

  return {
    score: metric.score || 0,
    numericValue: metric.numericValue || 0,
  };
}

function parseToFixedNumber(num: number, fractionDigits: number) {
  return Number(num.toFixed(fractionDigits));
}

function generateMetric<TKey extends string>({
  key,
  length,
  report,
}: {
  key: TKey;
  length: number;
  report: {
    [key in TKey]: {
      numericValue: number;
      score: number;
    };
  };
}) {
  return {
    numericValue: parseToFixedNumber(report[key].numericValue / length, 3),
    score: parseToFixedNumber((report[key].score / length) * 100, 2),
  };
}

export function parseNavigationResults(
  navigationReports: FlowResult.Step[]
): NavigationResult {
  const mergedReports = navigationReports.reduce(
    function parseNavigationResultsReduce(acc, report) {
      const fcp = parse(report, "first-contentful-paint");
      const lcp = parse(report, "largest-contentful-paint");
      const tbt = parse(report, "total-blocking-time");
      const cls = parse(report, "cumulative-layout-shift");
      const speed = report.lhr.audits["speed-index"];

      return {
        fcp: {
          numericValue: acc.fcp.numericValue + fcp.numericValue,
          score: acc.fcp.score + fcp.score,
        },
        lcp: {
          numericValue: acc.lcp.numericValue + lcp.numericValue,
          score: acc.lcp.score + lcp.score,
        },
        tbt: {
          numericValue: acc.tbt.numericValue + tbt.numericValue,
          score: acc.tbt.score + tbt.score,
        },
        cls: {
          numericValue: acc.cls.numericValue + cls.numericValue,
          score: acc.cls.score + cls.score,
        },
        speed: {
          numericValue: acc.speed.numericValue + (speed.numericValue || 0),
          score: acc.speed.score + (speed.score || 0),
        },
        performance:
          acc.performance + (report.lhr.categories.performance.score || 0),
        accessibility:
          acc.accessibility + (report.lhr.categories.accessibility.score || 0),
        best_practices:
          acc.best_practices +
          (report.lhr.categories["best-practices"].score || 0),
        seo: acc.seo + (report.lhr.categories.seo.score || 0),
      };
    },
    {
      fcp: {
        numericValue: 0,
        score: 0,
      },
      lcp: {
        numericValue: 0,
        score: 0,
      },
      tbt: {
        numericValue: 0,
        score: 0,
      },
      cls: {
        numericValue: 0,
        score: 0,
      },
      speed: {
        numericValue: 0,
        score: 0,
      },
      performance: 0,
      accessibility: 0,
      best_practices: 0,
      seo: 0,
    } satisfies NavigationResult
  );

  const length = navigationReports.length;
  return {
    fcp: generateMetric({ key: "fcp", length, report: mergedReports }),
    lcp: generateMetric({ key: "lcp", length, report: mergedReports }),
    tbt: generateMetric({ key: "tbt", length, report: mergedReports }),
    cls: generateMetric({ key: "cls", length, report: mergedReports }),
    speed: generateMetric({ key: "speed", length, report: mergedReports }),
    performance: parseToFixedNumber(
      (mergedReports.performance / length) * 100,
      2
    ),
    accessibility: parseToFixedNumber(
      (mergedReports.accessibility / length) * 100,
      2
    ),
    best_practices: parseToFixedNumber(
      (mergedReports.best_practices / length) * 100,
      2
    ),
    seo: parseToFixedNumber((mergedReports.seo / length) * 100, 2),
  };
}

export function parseTimespanResults(
  timespanReports: FlowResult.Step[]
): TimespanResult {
  const mergedReports = timespanReports.reduce(
    function parseTimespanResultsReduce(acc, report) {
      const tbt = parse(report, "total-blocking-time");
      const cls = parse(report, "cumulative-layout-shift");
      const inp = parse(report, "interaction-to-next-paint");
      const longTasks = (
        report.lhr.audits["long-tasks"].details! as unknown as {
          items: {
            url: string;
            duration: number;
            startTime: number;
          }[];
        }
      ).items;

      return {
        performance:
          acc.performance + (report.lhr.categories.performance.score || 0),
        tbt: {
          numericValue: acc.tbt.numericValue + tbt.numericValue,
          score: acc.tbt.score + tbt.score,
        },
        cls: {
          numericValue: acc.cls.numericValue + cls.numericValue,
          score: acc.cls.score + cls.score,
        },
        inp: {
          numericValue: acc.inp.numericValue + inp.numericValue,
          score: acc.inp.score + inp.score,
        },
        best_practices:
          acc.best_practices +
          (report.lhr.categories["best-practices"].score || 0),
        longTasks: {
          total: acc.longTasks.total + longTasks.length,
          durationMs: longTasks.reduce(
            (sum, task) => sum + task.duration,
            acc.longTasks.durationMs
          ),
        },
      };
    },
    {
      performance: 0,
      tbt: {
        numericValue: 0,
        score: 0,
      },
      cls: {
        numericValue: 0,
        score: 0,
      },
      inp: { numericValue: 0, score: 0 },
      best_practices: 0,
      longTasks: {
        total: 0,
        durationMs: 0,
      },
    } satisfies TimespanResult
  );

  const length = timespanReports.length;
  return {
    performance: parseToFixedNumber(
      (mergedReports.performance / length) * 100,
      2
    ),
    tbt: generateMetric({ key: "tbt", length, report: mergedReports }),
    cls: generateMetric({ key: "cls", length, report: mergedReports }),
    inp: generateMetric({ key: "inp", length, report: mergedReports }),
    best_practices: parseToFixedNumber(
      (mergedReports.best_practices / length) * 100,
      2
    ),
    longTasks: {
      total: parseToFixedNumber(mergedReports.longTasks.total / length, 0),
      durationMs: parseToFixedNumber(
        mergedReports.longTasks.durationMs / length,
        3
      ),
    },
  };
}

export function parseSnapshotResults(
  snapshotReports: FlowResult.Step[]
): SnapshotResult {
  const mergedReports = snapshotReports.reduce(
    function parseSnapshotResultsReduce(acc, report) {
      return {
        performance:
          acc.performance + (report.lhr.categories.performance.score || 0),
        best_practices:
          acc.best_practices +
          (report.lhr.categories["best-practices"].score || 0),
        accessibility:
          acc.accessibility +
          (report.lhr.categories["accessibility"].score || 0),
        seo: acc.seo + (report.lhr.categories["seo"].score || 0),
      };
    },
    {
      performance: 0,
      best_practices: 0,
      accessibility: 0,
      seo: 0,
    } satisfies SnapshotResult
  );

  const length = snapshotReports.length;
  return {
    performance: parseToFixedNumber(
      (mergedReports.performance / length) * 100,
      2
    ),
    best_practices: parseToFixedNumber(
      (mergedReports.best_practices / length) * 100,
      2
    ),
    accessibility: parseToFixedNumber(
      (mergedReports.accessibility / length) * 100,
      2
    ),
    seo: parseToFixedNumber((mergedReports.seo / length) * 100, 2),
  };
}

export function parseLighthouseReports(
  reports: FlowResult[]
): [NavigationResult, TimespanResult, SnapshotResult] {
  const navigationReports = reports.map((report) => report.steps[0]);
  const timespanReports = reports.map((report) => report.steps[1]);
  const SnapshotReports = reports.map((report) => report.steps[2]);

  return [
    parseNavigationResults(navigationReports),
    parseTimespanResults(timespanReports),
    parseNavigationResults(SnapshotReports),
  ] as const;
}
