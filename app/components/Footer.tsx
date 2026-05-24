import { getTranslations } from "next-intl/server";

import { currentYear } from "../lib/dates";

export default async function Footer() {
  const t = await getTranslations("Footer");

  return (
    <footer className="bg-zinc-900 border-t border-zinc-800 py-4">
      <div className="container mx-auto px-4 text-center">
        <p className="text-zinc-400 text-sm">
          © {currentYear()} Cristian Botez. {t("rights")}
        </p>
      </div>
    </footer>
  );
}
