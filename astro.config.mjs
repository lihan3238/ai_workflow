import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";

export default defineConfig({
  devToolbar: {
    enabled: false
  },
  integrations: [mdx()],
  site: "https://workflow-home.local"
});
