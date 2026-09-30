import { describe, it, expect } from "vitest";
import { momentoDe, maisRecentePrimeiro } from "@/components/atlas/momento";

describe("momentoDe", () => {
  it("usa a data de criação quando o registo foi gravado na hora", () => {
    expect(momentoDe({ created_date: "2026-09-20T10:00:00Z" })).toBe("2026-09-20T10:00:00Z");
  });

  it("prefere ocorrido_em — o registo chegou depois do facto", () => {
    const importado = { created_date: "2026-09-28T18:00:00Z", ocorrido_em: "2026-08-01T09:15:00Z" };
    expect(momentoDe(importado)).toBe("2026-08-01T09:15:00Z");
  });

  it("aguenta um registo em falta ou sem datas", () => {
    expect(momentoDe(null)).toBe(null);
    expect(momentoDe({})).toBe(null);
  });
});

describe("maisRecentePrimeiro", () => {
  it("ordena pela data real, não pela da gravação", () => {
    const lista = [
      { id: "antigo", created_date: "2026-09-28T18:00:00Z", ocorrido_em: "2026-08-01T00:00:00Z" },
      { id: "novo", created_date: "2026-09-10T00:00:00Z" },
      { id: "sem-data" },
    ];
    expect([...lista].sort(maisRecentePrimeiro).map((r) => r.id)).toEqual(["novo", "antigo", "sem-data"]);
  });
});
