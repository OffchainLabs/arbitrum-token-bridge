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
  performance: {
    total: number;
    tbt: Metric;
    cls: Metric;
    inp: Metric;
  };
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
  seo: Result;
};

function parse(result: FlowResult.Step, metricName: string): Metric {
  const metric = result.lhr.audits[metricName];

  return {
    score: metric.score!,
    numericValue: Number(metric.numericUnit)!,
  };
}

function parseNavigationResults(
  navigationReports: FlowResult.Step[]
): NavigationResult {
  const mergedReports = navigationReports.reduce(
    (acc, report) => {
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
        performance: acc.performance + report.lhr.categories.performance.score!,
        accessibility:
          acc.accessibility + report.lhr.categories.accessibility.score!,
        best_practices:
          acc.best_practices + report.lhr.categories["best-practices"].score!,
        seo: acc.seo + report.lhr.categories.seo.score!,
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
    fcp: {
      numericValue: mergedReports.fcp.numericValue / length,
      score: mergedReports.fcp.score / length,
    },
    lcp: {
      numericValue: mergedReports.lcp.numericValue / length,
      score: mergedReports.lcp.score / length,
    },
    tbt: {
      numericValue: mergedReports.tbt.numericValue / length,
      score: mergedReports.tbt.score / length,
    },
    cls: {
      numericValue: mergedReports.cls.numericValue / length,
      score: mergedReports.cls.score / length,
    },
    speed: {
      numericValue: mergedReports.speed.numericValue / length,
      score: mergedReports.speed.score / length,
    },
    performance: mergedReports.performance / length,
    accessibility: mergedReports.accessibility / length,
    best_practices: mergedReports.best_practices / length,
    seo: mergedReports.seo / length,
  };
}

function parseTimespanResults(
  timespanReports: FlowResult.Step[]
): TimespanResult {
  const mergedReports = timespanReports.reduce(
    (acc, report) => {
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
        performance: {
          total:
            acc.performance.total +
            (report.lhr.categories.performance.score || 0),
          tbt: {
            numericValue: acc.performance.tbt.numericValue + tbt.numericValue,
            score: acc.performance.tbt.score + tbt.score,
          },
          cls: {
            numericValue: acc.performance.cls.numericValue + cls.numericValue,
            score: acc.performance.cls.score + cls.score,
          },
          inp: {
            numericValue: acc.performance.inp.numericValue + inp.numericValue,
            score: acc.performance.inp.score + inp.score,
          },
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
      performance: {
        total: 0,
        tbt: {
          numericValue: 0,
          score: 0,
        },
        cls: {
          numericValue: 0,
          score: 0,
        },
        inp: { numericValue: 0, score: 0 },
      },
      best_practices: 0,
      longTasks: {
        total: 0,
        durationMs: 0,
      },
    } satisfies TimespanResult
  );

  const length = timespanReports.length;
  return {
    performance: {
      total: mergedReports.performance.total / length,
      tbt: {
        numericValue: mergedReports.performance.tbt.numericValue,
        score: mergedReports.performance.tbt.numericValue,
      },
      cls: {
        numericValue: mergedReports.performance.cls.numericValue,
        score: mergedReports.performance.cls.numericValue,
      },
      inp: {
        numericValue: mergedReports.performance.inp.numericValue,
        score: mergedReports.performance.inp.numericValue,
      },
    },
    best_practices: mergedReports.best_practices / length,
    longTasks: {
      total: mergedReports.longTasks.total / length,
      durationMs: mergedReports.longTasks.durationMs / length,
    },
  };
}

export function parseLighthouseReports(
  reports: FlowResult[]
): [NavigationResult, TimespanResult] {
  const navigationReports = reports.map((report) => report.steps[0]);
  const timespanReports = reports.map((report) => report.steps[0]);

  return [
    parseNavigationResults(navigationReports),
    parseTimespanResults(timespanReports),
  ] as const;
}
