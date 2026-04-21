try {
  require('./dist/server.js');
} catch (error) {
  console.error(
    '[BOOT] Backend belum ter-build. Jalankan `npm run dev` untuk mode development atau `npm run build && npm start` untuk production.'
  );
  console.error(error);
  process.exit(1);
}
