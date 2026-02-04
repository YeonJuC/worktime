import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// ✅ GitHub Pages에서도 잘 뜨도록 기본값은 "./"
// (도메인/서브경로 배포가 아니라면 이게 제일 사고가 덜 남)
export default defineConfig({
  plugins: [react()],
  base: "./",
});
