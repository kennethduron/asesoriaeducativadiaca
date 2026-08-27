import { describe, expect, it } from "vitest";

import { isAdminNavigationItemActive } from "./admin";

describe("admin navigation", () => {
  it("only marks Inicio on the admin index", () => {
    expect(isAdminNavigationItemActive("/admin", "/admin")).toBe(true);
    expect(isAdminNavigationItemActive("/admin/clientes", "/admin")).toBe(
      false,
    );
  });

  it("keeps a module active on nested routes", () => {
    expect(
      isAdminNavigationItemActive(
        "/admin/clientes/0f7d/editar",
        "/admin/clientes",
      ),
    ).toBe(true);
    expect(
      isAdminNavigationItemActive(
        "/admin/estados-de-cuenta",
        "/admin/clientes",
      ),
    ).toBe(false);
  });
});
