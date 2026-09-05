import type { Metadata } from "next";
import { RecurringAccessPage } from "@/components/recurring-access/RecurringAccessPage";
import { APP_BRAND, buildAppUrl, withBrand } from "@/config/app-brand";

export const metadata: Metadata = {
  title: withBrand("Acesso rapido"),
  description: `Acesse rapidamente seu estabelecimento lembrado no ${APP_BRAND.appName}.`,
  alternates: {
    canonical: buildAppUrl("/acesso")
  }
};

export default function AcessoPage() {
  return <RecurringAccessPage />;
}
