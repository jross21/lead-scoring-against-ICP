import { describe, it, expect } from "vitest";
import { mapColumns, applyMap } from "../mapColumns";

describe("mapColumns", () => {
  it("maps standard headers correctly", () => {
    const result = mapColumns(["Name", "Email", "Company", "Title"]);
    expect(result.name).toBe("Name");
    expect(result.email).toBe("Email");
    expect(result.company).toBe("Company");
    expect(result.title).toBe("Title");
    expect(result.extra).toEqual([]);
  });

  it("maps first+last name pair as array", () => {
    const result = mapColumns(["First Name", "Last Name", "Email"]);
    expect(result.name).toEqual(["First Name", "Last Name"]);
    expect(result.email).toBe("Email");
  });

  it("maps only first name when no last name present", () => {
    const result = mapColumns(["First Name", "Email"]);
    expect(result.name).toBe("First Name");
  });

  it("is case-insensitive", () => {
    const result = mapColumns(["EMAIL", "COMPANY", "JOB TITLE", "FULL NAME"]);
    expect(result.email).toBe("EMAIL");
    expect(result.company).toBe("COMPANY");
    expect(result.title).toBe("JOB TITLE");
    expect(result.name).toBe("FULL NAME");
  });

  it("puts unrecognized headers in extra", () => {
    const result = mapColumns(["Name", "Revenue", "Employees"]);
    expect(result.name).toBe("Name");
    expect(result.extra).toEqual(["Revenue", "Employees"]);
  });

  it("returns all nulls and empty extra for completely unknown headers", () => {
    const result = mapColumns(["Foo", "Bar"]);
    expect(result.name).toBeNull();
    expect(result.email).toBeNull();
    expect(result.company).toBeNull();
    expect(result.title).toBeNull();
    expect(result.extra).toEqual(["Foo", "Bar"]);
  });

  it("recognizes alternate column name variants", () => {
    const result = mapColumns(["contact name", "work email", "organisation", "position"]);
    expect(result.name).toBe("contact name");
    expect(result.email).toBe("work email");
    expect(result.company).toBe("organisation");
    expect(result.title).toBe("position");
  });
});

describe("applyMap", () => {
  it("maps a standard row correctly", () => {
    const map = mapColumns(["Name", "Email", "Company", "Title"]);
    const row = { Name: "Jane Doe", Email: "jane@acme.com", Company: "Acme", Title: "VP Sales" };
    const result = applyMap(row, map);
    expect(result).toEqual({ name: "Jane Doe", email: "jane@acme.com", company: "Acme", title: "VP Sales", extra: {} });
  });

  it("joins first+last name with a space", () => {
    const map = mapColumns(["First Name", "Last Name", "Email"]);
    const row = { "First Name": "Jane", "Last Name": "Doe", Email: "jane@acme.com" };
    const result = applyMap(row, map);
    expect(result.name).toBe("Jane Doe");
  });

  it("handles missing last name gracefully", () => {
    const map = mapColumns(["First Name", "Last Name", "Email"]);
    const row = { "First Name": "Jane", "Last Name": "", Email: "jane@acme.com" };
    const result = applyMap(row, map);
    expect(result.name).toBe("Jane");
  });

  it("populates extra fields", () => {
    const map = mapColumns(["Name", "Email", "Revenue"]);
    const row = { Name: "Jane", Email: "jane@acme.com", Revenue: "5M" };
    const result = applyMap(row, map);
    expect(result.extra).toEqual({ Revenue: "5M" });
  });

  it("omits empty extra field values", () => {
    const map = mapColumns(["Name", "Revenue"]);
    const row = { Name: "Jane", Revenue: "" };
    const result = applyMap(row, map);
    expect(result.extra).toEqual({});
  });

  it("falls back to empty string when mapped column is missing from row", () => {
    const map = mapColumns(["Name", "Email"]);
    const row = { Name: "Jane" }; // Email key missing
    const result = applyMap(row, map);
    expect(result.email).toBe("");
  });
});
