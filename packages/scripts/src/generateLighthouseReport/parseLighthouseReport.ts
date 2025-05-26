import { FlowResult, Result } from "lighthouse";

type Metric = {
  /** Number from 0 to 1 */
  score: number;
  numericValue: string;
  displayValue: string;
  scoringOptions: {
    p10: number;
    median: number;
  };
};
type NavigationResult = {
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
type TimespanResult = {
  performance: {
    total: number;
    tbt: Metric;
    cls: Metric;
    inp: Metric;
  };
  best_practices: number;
};
type SnapshotResult = {
  performance: number;
  accessibility: number;
  best_practices: number;
  seo: Result;
};

function parseNavigationResult(
  navigationResult: FlowResult.Step
): NavigationResult {
  const fcp = navigationResult.lhr.audits["first-contentful-paint"];
  const lcp = navigationResult.lhr.audits["largest-contentful-paint"];
  const tbt = navigationResult.lhr.audits["total-blocking-time"];
  const cls = navigationResult.lhr.audits["first-contentful-paint"];
  const speed = navigationResult.lhr.audits["speed-index"];

  return {
    fcp: {
      score: fcp.score!,
      displayValue: fcp.displayValue!,
      numericValue: fcp.numericUnit!,
      scoringOptions: fcp.scoringOptions!,
    },
    lcp: {
      score: lcp.score!,
      displayValue: lcp.displayValue!,
      numericValue: lcp.numericUnit!,
      scoringOptions: lcp.scoringOptions!,
    },
    tbt: {
      score: tbt.score!,
      displayValue: tbt.displayValue!,
      numericValue: tbt.numericUnit!,
      scoringOptions: tbt.scoringOptions!,
    },
    cls: {
      score: cls.score!,
      displayValue: cls.displayValue!,
      numericValue: cls.numericUnit!,
      scoringOptions: cls.scoringOptions!,
    },
    speed: {
      score: speed.score!,
      displayValue: speed.displayValue!,
      numericValue: speed.numericUnit!,
      scoringOptions: speed.scoringOptions!,
    },
    performance: navigationResult.lhr.categories.performance.score!,
    accessibility: navigationResult.lhr.categories.accessibility.score!,
    best_practices: navigationResult.lhr.categories["best-practices"].score!,
    seo: navigationResult.lhr.categories.seo.score!,
  };
}

export function parseLighthouseReport(report: FlowResult): [NavigationResult] {
  return [parseNavigationResult(report.steps[0])];
}
