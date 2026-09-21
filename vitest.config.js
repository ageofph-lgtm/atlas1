import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve("src") },
  },
  test: {
    globals: true,
    // Ambiente node: o que se testa aqui são as regras de domínio, funções
    // puras que não precisam de DOM. Componentes continuam a ser validados no
    // browser, com Playwright.
    environment: "node",
    include: ["src/**/*.test.js"],
    setupFiles: ["src/test/setup.js"],
  },
});
