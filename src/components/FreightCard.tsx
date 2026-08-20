import { useId, useMemo } from "react";
import {
  ANTT_COEF,
  PESO,
  brl,
  calcular,
  formatMoneyValue,
  maskMoney,
  parseMoney,
  pct,
  type DadosCard,
  type DadosGerais,
} from "@/lib/pricing";

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-2.5 mb-1 border-b border-line pb-1 text-[11px] font-extrabold uppercase tracking-[0.06em] text-accent-dark first:mt-0">
      {children}
    </div>
  );
}

function Row({
  label,
  value,
  sub,
  strong,
}: {
  label: React.ReactNode;
  value: string;
  sub?: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2.5 py-0.5 text-[13px]">
      <div className={strong ? "font-bold text-ink" : "text-ink-soft"}>{label}</div>
      <div className="flex items-baseline gap-2">
        <div className="font-bold tabular-nums">{value}</div>
        {sub !== undefined && (
          <div className="text-[11.5px] tabular-nums text-ink-soft">{sub}</div>
        )}
      </div>
    </div>
  );
}

function InputRow({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: "text" | "date";
}) {
  const inputId = useId();
  return (
    <div className="my-0.5 flex items-center justify-between gap-2.5 rounded-[7px] border border-warn-line bg-warn-field px-2.5 py-1">
      <label
        htmlFor={inputId}
        className="text-[12.5px] font-semibold text-warn-ink"
      >
        {label}
      </label>
      <input
        id={inputId}
        type={type}
        inputMode={type === "text" ? "decimal" : undefined}
        placeholder={type === "text" ? "0,00" : undefined}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-[130px] rounded-md border border-warn-line bg-panel px-2 py-1 text-[13px] text-right focus:outline-2 focus:outline-offset-1 focus:outline-accent"
      />
    </div>
  );
}

export function FreightCard({
  eixos,
  gerais,
  card,
  onChange,
}: {
  eixos: number;
  gerais: DadosGerais;
  card: DadosCard;
  onChange: (patch: Partial<DadosCard>) => void;
}) {
  const c = useMemo(() => calcular(eixos, gerais, card), [eixos, gerais, card]);
  const peso = PESO[eixos]!;
  const coef = ANTT_COEF[gerais.tipo][eixos]!;

  const decidir = (tipo: "Aprovado" | "Reprovado") =>
    onChange({ status: `${tipo} em ${new Date().toLocaleString("pt-BR")}` });

  const aprovado = card.status.startsWith("Aprovado");
  const reprovado = card.status.startsWith("Reprovado");
  const viavelFinanceiro = c.moR > 0 && c.moTon > 0 && c.moPct > 0;

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-line bg-panel">
      <div className="flex items-baseline justify-between bg-navy px-4 py-3">
        <div className="text-[17px] font-extrabold text-primary-foreground">
          {eixos} eixos
        </div>
        <div className="text-xs text-primary-foreground/70">Peso médio: {peso} ton</div>
      </div>

      <div className="px-4 pt-3.5 pb-4">
        <SectionTitle>Tabela ANTT (piso)</SectionTitle>
        <div className="my-0.5 mb-1.5 text-[10.5px] italic text-ink-soft">
          Deslocamento{" "}
          {coef.desloc.toLocaleString("pt-BR", { minimumFractionDigits: 4 })} R$/km ·
          Carga/Descarga {brl(coef.cd)}
        </div>
        <Row label="Tabela ANTT" value={brl(c.anttR)} sub={`${brl(c.anttTon)}/ton`} />
        <Row
          label="SEST/SENAT + INSS"
          value={c.sestPct > 0 ? pct(c.sestPct) : "— (PJ)"}
        />
        <Row
          strong
          label="Tabela ANTT Motorista"
          value={brl(c.anttMotR)}
          sub={`${brl(c.anttMotTon)}/ton`}
        />

        <SectionTitle>Frete Empresa</SectionTitle>
        <InputRow
          label="Frete Empresa (R$)"
          value={card.freteEmpresaR}
          onChange={(v) => {
            const masked = maskMoney(v);
            onChange({
              freteEmpresaR: masked,
              freteEmpresaTon: masked ? formatMoneyValue(parseMoney(masked) / peso) : "",
            });
          }}
        />
        <InputRow
          label="Frete Empresa (R$/ton)"
          value={card.freteEmpresaTon}
          onChange={(v) => {
            const masked = maskMoney(v);
            onChange({
              freteEmpresaTon: masked,
              freteEmpresaR: masked ? formatMoneyValue(parseMoney(masked) * peso) : "",
            });
          }}
        />

        <SectionTitle>Pedágio</SectionTitle>
        <InputRow
          label="Pedágio (R$)"
          value={card.pedagio}
          onChange={(v) => onChange({ pedagio: maskMoney(v) })}
        />
        <Row label="Pedágio (R$/ton)" value={brl(c.pedagioTon)} />
        <Row
          label="Tabela ANTT + Pedágio"
          value={brl(c.anttPedR)}
          sub={`${brl(c.anttPedTon)}/ton`}
        />

        <SectionTitle>Impostos e Encargos</SectionTitle>
        <Row label="ICMS" value={brl(c.icmsR)} sub={`${brl(c.icmsR / peso)}/ton`} />
        <Row label="PIS/COFINS" value={brl(c.pisR)} sub={`${brl(c.pisR / peso)}/ton`} />
        <Row label="Seguros" value={brl(c.segR)} sub={`${brl(c.segR / peso)}/ton`} />
        <Row
          label="Efrete/Pamcard"
          value={brl(c.efrR)}
          sub={`${brl(c.efrR / peso)}/ton`}
        />
        <Row
          strong
          label="Saldo Link pós despesas"
          value={brl(c.saldoR)}
          sub={`${brl(c.saldoR / peso)}/ton`}
        />

        <SectionTitle>Frete Motorista</SectionTitle>
        <InputRow
          label="Frete Motorista (R$)"
          value={card.freteMotoristaR}
          onChange={(v) => {
            const masked = maskMoney(v);
            onChange({
              freteMotoristaR: masked,
              freteMotoristaTon: masked ? formatMoneyValue(parseMoney(masked) / peso) : "",
            });
          }}
        />
        <InputRow
          label="Frete Motorista (R$/ton)"
          value={card.freteMotoristaTon}
          onChange={(v) => {
            const masked = maskMoney(v);
            onChange({
              freteMotoristaTon: masked,
              freteMotoristaR: masked ? formatMoneyValue(parseMoney(masked) * peso) : "",
            });
          }}
        />
        <Row
          label="Frete Motorista c/ Pedágio"
          value={brl(c.fmpR)}
          sub={`${brl(c.fmpR / peso)}/ton`}
        />

        <div
          className={`mt-2.5 rounded-lg p-2.5 text-center text-sm font-extrabold tracking-[0.03em] ${
            c.viavel
              ? "bg-success-bg text-success"
              : "bg-danger-bg text-danger"
          }`}
        >
          VIABILIDADE ANTT: {c.viavel ? "SIM" : "NÃO"}
        </div>

        <SectionTitle>Margem Operacional</SectionTitle>
        <div className="mt-1 flex flex-col gap-1 rounded-lg bg-secondary px-3 py-2">
          <div className="border-b border-dashed border-line">
            <Row label="Valor (R$)" value={brl(c.moR)} />
          </div>
          <div className="border-b border-dashed border-line">
            <Row label="Valor (R$/ton)" value={brl(c.moTon)} />
          </div>
          <Row label="Margem (%)" value={pct(c.moPct)} />
        </div>

        <div
          className={`mt-2.5 rounded-lg p-2.5 text-center text-sm font-extrabold tracking-[0.03em] ${
            viavelFinanceiro
              ? "bg-success-bg text-success"
              : "bg-danger-bg text-danger"
          }`}
        >
          VIABILIDADE FINANCEIRA: {viavelFinanceiro ? "SIM" : "NÃO"}
        </div>

        <SectionTitle>Data da Cotação</SectionTitle>
        <InputRow
          type="date"
          label="Data"
          value={card.data}
          onChange={(v) => onChange({ data: v })}
        />

        <div className="mt-2.5 flex gap-2">
          <button
            type="button"
            onClick={() => decidir("Aprovado")}
            className={`flex-1 rounded-md border py-2 text-[12.5px] font-bold transition-all ${
              aprovado
                ? "border-success bg-success text-primary-foreground"
                : "border-line bg-panel text-ink-soft hover:brightness-97"
            }`}
          >
            Aprovar
          </button>
          <button
            type="button"
            onClick={() => decidir("Reprovado")}
            className={`flex-1 rounded-md border py-2 text-[12.5px] font-bold transition-all ${
              reprovado
                ? "border-danger bg-danger text-primary-foreground"
                : "border-line bg-panel text-ink-soft hover:brightness-97"
            }`}
          >
            Reprovar
          </button>
        </div>
        <div className="mt-1.5 text-center text-[10.5px] font-semibold text-ink-soft">
          {card.status}
        </div>
      </div>
    </div>
  );
}
