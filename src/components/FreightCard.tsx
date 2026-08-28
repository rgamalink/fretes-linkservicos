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

function SectionTitle({ children, compacto }: { children: React.ReactNode; compacto?: boolean }) {
  return (
    <div
      className={`border-b border-line pb-1 text-[11px] font-extrabold uppercase tracking-[0.06em] text-accent-dark first:mt-0 ${
        compacto ? "mt-1.5 mb-0.5" : "mt-2.5 mb-1"
      }`}
    >
      {children}
    </div>
  );
}

function Row({
  label,
  value,
  sub,
  strong,
  negative,
  compacto,
}: {
  label: React.ReactNode;
  value: string;
  sub?: string;
  strong?: boolean;
  negative?: boolean;
  compacto?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-2 text-[12px] ${compacto ? "py-px" : "py-0.5"}`}
    >
      <div className={`whitespace-nowrap ${strong ? "font-bold text-ink" : "text-ink-soft"}`}>
        {label}
      </div>
      <div className="flex items-baseline gap-1.5">
        <div className={`font-bold tabular-nums ${negative ? "text-danger" : ""}`}>{value}</div>
        {sub !== undefined && (
          <div
            className={`text-[10.5px] tabular-nums ${negative ? "text-danger" : "text-ink-soft"}`}
          >
            {sub}
          </div>
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
  compacto,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: "text" | "date";
  compacto?: boolean;
}) {
  const inputId = useId();
  return (
    <div
      className={`flex items-center justify-between gap-2.5 rounded-[7px] border border-warn-line bg-warn-field px-2.5 ${
        compacto ? "my-px py-0.5" : "my-0.5 py-1"
      }`}
    >
      <label htmlFor={inputId} className="text-[12.5px] font-semibold text-warn-ink">
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
  compacto,
}: {
  eixos: number;
  gerais: DadosGerais;
  card: DadosCard;
  onChange: (patch: Partial<DadosCard>) => void;
  /** Layout com espaçamentos reduzidos, para caber os 4 cards na tela. */
  compacto?: boolean;
}) {
  const c = useMemo(() => calcular(eixos, gerais, card), [eixos, gerais, card]);
  const peso = PESO[eixos]!;
  const coef = ANTT_COEF[gerais.tipo][eixos]!;
  const compact = compacto === true;

  const decidir = (tipo: "Aprovado" | "Reprovado") =>
    onChange({ status: `${tipo} em ${new Date().toLocaleString("pt-BR")}` });

  const aprovado = card.status.startsWith("Aprovado");
  const reprovado = card.status.startsWith("Reprovado");
  const viavelFinanceiro = c.moR > 0 && c.moTon > 0 && c.moPct > 0;

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-line bg-panel">
      <div
        className={`flex items-baseline justify-between bg-navy px-4 ${compact ? "py-2" : "py-3"}`}
      >
        <div className="text-[17px] font-extrabold text-primary-foreground">{eixos} eixos</div>
        <div className="text-xs text-primary-foreground/70">Peso médio: {peso} ton</div>
      </div>

      <div className={compact ? "px-3.5 pt-2.5 pb-3" : "px-4 pt-3.5 pb-4"}>
        <SectionTitle compacto={compact}>Tabela ANTT (piso)</SectionTitle>
        <div
          className={`text-[10.5px] italic text-ink-soft ${compact ? "my-px mb-1" : "my-0.5 mb-1.5"}`}
        >
          Deslocamento {coef.desloc.toLocaleString("pt-BR", { minimumFractionDigits: 4 })} R$/km ·
          Carga/Descarga {brl(coef.cd)}
        </div>
        <Row
          compacto={compact}
          label="Tabela ANTT"
          value={brl(c.anttR)}
          sub={`${brl(c.anttTon)}/ton`}
        />
        <Row
          compacto={compact}
          label="SEST/SENAT + INSS"
          value={c.sestPct > 0 ? pct(c.sestPct) : "— (PJ)"}
        />
        <Row
          compacto={compact}
          strong
          label="Tabela ANTT Motorista"
          value={brl(c.anttMotR)}
          sub={`${brl(c.anttMotTon)}/ton`}
        />

        <SectionTitle compacto={compact}>Frete Empresa</SectionTitle>
        <InputRow
          compacto={compact}
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
          compacto={compact}
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

        <SectionTitle compacto={compact}>Pedágio</SectionTitle>
        <InputRow
          compacto={compact}
          label="Pedágio (R$)"
          value={card.pedagio}
          onChange={(v) => onChange({ pedagio: maskMoney(v) })}
        />
        <Row compacto={compact} label="Pedágio (R$/ton)" value={brl(c.pedagioTon)} />
        <Row
          compacto={compact}
          label="Tabela ANTT + Pedágio"
          value={brl(c.anttPedR)}
          sub={`${brl(c.anttPedTon)}/ton`}
        />

        <SectionTitle compacto={compact}>Impostos e Encargos</SectionTitle>
        <Row
          compacto={compact}
          label="ICMS"
          value={brl(c.icmsR)}
          sub={`${brl(c.icmsR / peso)}/ton`}
        />
        <Row
          compacto={compact}
          label="PIS/COFINS"
          value={brl(c.pisR)}
          sub={`${brl(c.pisR / peso)}/ton`}
        />
        <Row
          compacto={compact}
          label="Seguros"
          value={brl(c.segR)}
          sub={`${brl(c.segR / peso)}/ton`}
        />
        <Row
          compacto={compact}
          label="Efrete/Pamcard"
          value={brl(c.efrR)}
          sub={`${brl(c.efrR / peso)}/ton`}
        />
        <Row
          compacto={compact}
          strong
          label="Saldo Link pós despesas"
          value={brl(c.saldoR)}
          sub={`${brl(c.saldoR / peso)}/ton`}
        />

        <SectionTitle compacto={compact}>Frete Motorista</SectionTitle>
        <InputRow
          compacto={compact}
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
          compacto={compact}
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
          compacto={compact}
          label="Frete Motorista c/ Pedágio"
          value={brl(c.fmpR)}
          sub={`${brl(c.fmpR / peso)}/ton`}
        />

        <div
          className={`rounded-lg text-center text-sm font-extrabold tracking-[0.03em] ${
            compact ? "mt-1.5 p-1.5" : "mt-2.5 p-2.5"
          } ${c.viavel ? "bg-success-bg text-success" : "bg-danger-bg text-danger"}`}
        >
          VIABILIDADE ANTT: {c.viavel ? "SIM" : "NÃO"}
        </div>

        <SectionTitle compacto={compact}>Margem Operacional</SectionTitle>
        <div
          className={`flex flex-col rounded-lg bg-secondary px-3 ${
            compact ? "mt-0.5 gap-0.5 py-1.5" : "mt-1 gap-1 py-2"
          }`}
        >
          <div className="border-b border-dashed border-line">
            <Row compacto={compact} label="Valor (R$)" value={brl(c.moR)} negative={c.moR < 0} />
          </div>
          <div className="border-b border-dashed border-line">
            <Row
              compacto={compact}
              label="Valor (R$/ton)"
              value={brl(c.moTon)}
              negative={c.moTon < 0}
            />
          </div>
          <Row compacto={compact} label="Margem (%)" value={pct(c.moPct)} negative={c.moPct < 0} />
        </div>

        <div
          className={`rounded-lg text-center text-sm font-extrabold tracking-[0.03em] ${
            compact ? "mt-1.5 p-1.5" : "mt-2.5 p-2.5"
          } ${viavelFinanceiro ? "bg-success-bg text-success" : "bg-danger-bg text-danger"}`}
        >
          VIABILIDADE FINANCEIRA: {viavelFinanceiro ? "SIM" : "NÃO"}
        </div>

        <SectionTitle compacto={compact}>Data da Cotação</SectionTitle>
        <InputRow
          compacto={compact}
          type="date"
          label="Data"
          value={card.data}
          onChange={(v) => onChange({ data: v })}
        />

        <div className={`flex gap-2 ${compact ? "mt-1.5" : "mt-2.5"}`}>
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
