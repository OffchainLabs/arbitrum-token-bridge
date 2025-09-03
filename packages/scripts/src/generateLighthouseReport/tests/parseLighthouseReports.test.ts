import { describe, expect, it } from "vitest";

import report from "./__mocks__/output.json";
import {
  parseNavigationResults,
  parseSnapshotResults,
  parseTimespanResults,
} from "../parseLighthouseReports";
import { FlowResult } from "lighthouse";

const mock = report as unknown as FlowResult;

describe("ParseLighthouseReports", () => {
  it("Parse the navigation result", () => {
    const parsedReport = parseNavigationResults([mock.steps[0]]);
    expect(parsedReport).toMatchSnapshot();

    const mergedReports = parseNavigationResults([
      mock.steps[0],
      mock.steps[0],
      mock.steps[0],
    ]);
    expect(mergedReports).toEqual(parsedReport);
  });

  it("Parse the timesmapn result", () => {
    const parsedReport = parseTimespanResults([mock.steps[1]]);
    expect(parsedReport).toMatchSnapshot();

    const multipleReports = parseTimespanResults([
      mock.steps[1],
      mock.steps[1],
      mock.steps[1],
      mock.steps[1],
      mock.steps[1],
    ]);
    expect(multipleReports).toEqual(parsedReport);
  });

  it("Parse the snapshot result", () => {
    const parsedReport = parseSnapshotResults([mock.steps[2]]);
    expect(parsedReport).toMatchSnapshot();

    const multipleReports = parseSnapshotResults([
      mock.steps[2],
      mock.steps[2],
      mock.steps[2],
      mock.steps[2],
      mock.steps[2],
    ]);
    expect(multipleReports).toEqual(parsedReport);
  });
});
