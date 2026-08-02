import { defineConfig } from 'vite';

// 성원 앱(index.html) + 편집자 앱(admin.html) 멀티페이지
export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        admin: 'admin.html'
      }
    }
  }
});
