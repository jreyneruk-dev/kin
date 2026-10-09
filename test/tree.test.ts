import { describe, expect, it } from "vitest";
import { buildGraph, connectedComponent, generationsOf, surnameOf } from "@/lib/tree";
import type { Person, Union } from "@/lib/types";

function person(id: number, fullName: string, overrides: Partial<Person> = {}): Person {
  return {
    id,
    fullName,
    cluster: "family",
    nameNote: null,
    sex: null,
    birthDate: null,
    birthPlace: null,
    deathDate: null,
    deathPlace: null,
    notes: null,
    living: false,
    createdBy: "test",
    createdAt: 0,
    ...overrides,
  };
}

function union(id: number, partnerA: number, partnerB: number | null): Union {
  return {
    id,
    cluster: "family",
    partnerA,
    partnerB,
    marriageDate: null,
    marriagePlace: null,
    createdBy: "test",
    createdAt: 0,
  };
}

describe("surnameOf", () => {
  it("extracts the last word", () => {
    expect(surnameOf("Kathleen S Macartney")).toBe("Macartney");
    expect(surnameOf("Joseph Fahey")).toBe("Fahey");
  });

  it("handles single names", () => {
    expect(surnameOf("Aylwin")).toBe("Aylwin");
  });
});

describe("buildGraph + connectedComponent", () => {
  const people = [
    person(1, "William H Macartney", { birthDate: "1871" }),
    person(2, "Edith Maude Grainger", { birthDate: "1874" }),
    person(3, "Kathleen S Macartney"),
    person(4, "Aylwin P Davies"),
    person(5, "John's mother"),
    person(6, "Stranger"),
  ];
  const unions = [union(10, 1, 2), union(11, 3, 4)];
  const links = [
    { unionId: 10, personId: 3 },
    { unionId: 11, personId: 5 },
  ];
  const graph = buildGraph({ people, unions, childLinks: links });

  it("links children to their parents' union", () => {
    expect(graph.nodes.get(3)?.parents).toEqual([10]);
    expect(graph.nodes.get(5)?.parents).toEqual([11]);
  });

  it("computes the blood/marriage component", () => {
    const comp = connectedComponent(graph, 1);
    expect(comp.has(1)).toBe(true);
    expect(comp.has(2)).toBe(true);
    expect(comp.has(3)).toBe(true);
    expect(comp.has(4)).toBe(true);
    expect(comp.has(5)).toBe(true);
    expect(comp.has(6)).toBe(false);
  });
});

describe("generationsOf — open partner slots", () => {
  // The Macartney shape: Alfred Grainger (Edith's father) was recorded on the
  // 1896 marriage register with his wife still unknown — a union whose
  // partner_b is null, linked to a child whose OTHER parent link (union 10)
  // goes through the root's spouse. The layout bug dropped him entirely.
  const people = [
    person(1, "William Henry Macartney", { birthDate: "1871" }),
    person(2, "Edith Maude Grainger", { birthDate: "1874" }),
    person(3, "Eileen Maud Macartney"),
    person(25, "Richard Henry Macartney"),
    person(26, "Dora Dunne"),
    person(31, "Alfred Grainger"),
  ];
  const unions = [
    union(1, 1, 2), // William x Edith
    union(9, 25, 26), // Richard x Dora
    union(12, 31, null), // Alfred — open partner slot
  ];
  const links = [
    { unionId: 1, personId: 3 },
    { unionId: 9, personId: 1 },
    { unionId: 12, personId: 2 },
  ];
  const graph = buildGraph({ people, unions, childLinks: links });

  it("reaches an in-component parent through an open partner slot", () => {
    const comp = connectedComponent(graph, 1);
    expect(comp.has(31)).toBe(true);
  });

  it("sits the open-slot parent one row above their child", () => {
    const gens = generationsOf(graph, 1);
    const levelOf = (id: number) =>
      gens.findIndex((g) => g.people.some((p) => p.id === id));
    const edith = levelOf(2);
    const alfred = levelOf(31);
    expect(edith).toBe(1);
    expect(alfred).toBe(0); // one above Edith, same row as Richard & Dora
    expect(levelOf(25)).toBe(0);
    expect(levelOf(26)).toBe(0);
  });
});

describe("generationsOf", () => {
  it("places parents above children and spouses on the same level", () => {
    const people = [
      person(1, "William H Macartney"),
      person(2, "Edith Maude Grainger"),
      person(3, "Mabel C Macartney"),
      person(4, "Joseph Fahey"),
      person(5, "Fahey child"),
    ];
    const unions = [union(10, 1, 2), union(11, 3, 4)];
    const links = [
      { unionId: 10, personId: 3 },
      { unionId: 11, personId: 5 },
    ];
    const graph = buildGraph({ people, unions, childLinks: links });
    const gens = generationsOf(graph, 3);

    expect(gens.length).toBe(3);
    const level0 = gens[0].people.map((p) => p.id);
    const level1 = gens[1].people.map((p) => p.id);
    const level2 = gens[2].people.map((p) => p.id);
    expect(level0).toContain(1);
    expect(level0).toContain(2);
    expect(level1).toContain(3);
    expect(level1).toContain(4); // spouse snapped to Mabel's level
    expect(level2).toContain(5);
  });
});
