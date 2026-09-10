import React from "react";
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type { TemplateEntry } from "./registry";

const APP_URL = "https://freteslinkservicos.lovable.app";

interface Props {
  cliente?: string;
  origem?: string;
  ufOrigem?: string;
  destino?: string;
  ufDestino?: string;
  submittedByEmail?: string;
}

const CotacaoPendenteEmail = ({
  cliente,
  origem,
  ufOrigem,
  destino,
  ufDestino,
  submittedByEmail,
}: Props) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Nova cotação aguardando aprovação</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={banner}>
          <Text style={bannerText}>Sistema de Precificação de Fretes</Text>
        </Section>
        <Heading style={heading}>Cotação para aprovar</Heading>
        <Text style={text}>Uma cotação foi submetida e aguarda sua aprovação.</Text>
        <Hr style={hr} />
        <Text style={row}>
          <strong>Cliente:</strong> {cliente || "não informado"}
        </Text>
        <Text style={row}>
          <strong>Origem:</strong>{" "}
          {origem ? `${origem}${ufOrigem ? `/${ufOrigem}` : ""}` : "não informada"}
        </Text>
        <Text style={row}>
          <strong>Destino:</strong>{" "}
          {destino ? `${destino}${ufDestino ? `/${ufDestino}` : ""}` : "não informado"}
        </Text>
        <Text style={row}>
          <strong>Enviado por:</strong> {submittedByEmail || "não informado"}
        </Text>
        <Hr style={hr} />
        <Section style={{ textAlign: "center", margin: "22px 0" }}>
          <Button style={buttonStyle} href={APP_URL}>
            Acessar o sistema de frete
          </Button>
        </Section>
        <Text style={footer}>
          Acesse o painel "Aprovação de Cotações" no sistema para aprovar ou reprovar.
        </Text>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: CotacaoPendenteEmail,
  subject: "Cotação para aprovar",
  displayName: "Cotação pendente (aprovação)",
  previewData: {
    cliente: "Empresa Exemplo",
    origem: "São Paulo",
    ufOrigem: "SP",
    destino: "Curitiba",
    ufDestino: "PR",
    submittedByEmail: "usuario@empresa.com.br",
  },
} satisfies TemplateEntry;

const main = { backgroundColor: "#ffffff", fontFamily: "Barlow, Arial, sans-serif" };
const container = { padding: "24px", maxWidth: "560px" };
const banner = {
  backgroundColor: "#0f2036",
  borderRadius: "8px",
  padding: "14px 18px",
};
const bannerText = {
  color: "#ffffff",
  fontSize: "14px",
  fontWeight: 700,
  margin: "0",
  letterSpacing: "0.3px",
};
const heading = { fontSize: "19px", color: "#0f2036", margin: "22px 0 6px" };
const text = { fontSize: "14px", color: "#3d4a5c", margin: "0 0 6px" };
const row = { fontSize: "14px", color: "#0f2036", margin: "4px 0" };
const hr = { borderColor: "#e3e8ef", margin: "18px 0" };
const buttonStyle = {
  backgroundColor: "#0f2036",
  borderRadius: "6px",
  color: "#ffffff",
  fontSize: "14px",
  fontWeight: 700,
  textDecoration: "none",
  padding: "12px 22px",
  display: "inline-block",
};
const footer = { fontSize: "13px", color: "#66738a" };
