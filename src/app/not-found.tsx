export default function NotFound() {
  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{
          __html: `(() => {\n            try { sessionStorage.setItem('sheko-pending-path', location.pathname + location.search + location.hash); } catch {}\n            const base='__SHEKO_BASE_PATH__';\n            location.replace(base + '/');\n          })();`,
        }} />
      </head>
      <body />
    </html>
  );
}
