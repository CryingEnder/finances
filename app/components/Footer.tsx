export default function Footer() {
  return (
    <footer className="bg-zinc-900 border-t border-zinc-800 py-4">
      <div className="container mx-auto px-4 text-center">
        <p className="text-zinc-400 text-sm">
          © {new Date().getFullYear()} Cristian Botez. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
