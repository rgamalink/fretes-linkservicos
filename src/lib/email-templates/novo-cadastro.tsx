import React from 'react'
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
} from '@react-email/components'
import type { TemplateEntry } from './registry'

const APP_URL = 'https://freteslinkservicos.lovable.app'

interface Props {
  nome?: string
  email?: string
  empresa?: string
}

const NovoCadastroEmail = ({ nome, email, empresa }: Props) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Novo usuário a aprovar Frete Link Serviços</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={banner}>
          <Text style={bannerText}>Sistema de Precificação de Fretes</Text>
        </Section>
        <Heading style={heading}>Novo usuário a aprovar Frete Link Serviços</Heading>
        <Text style={text}>
          Um novo usuário criou uma conta e aguarda liberação de acesso.
        </Text>
        <Hr style={hr} />
        <Text style={row}>
          <strong>Nome:</strong> {nome || 'não informado'}
        </Text>
        <Text style={row}>
          <strong>E-mail:</strong> {email || 'não informado'}
        </Text>
        <Text style={row}>
          <strong>Empresa:</strong> {empresa || 'não informada'}
        </Text>
        <Hr style={hr} />
        <Section style={{ textAlign: 'center', margin: '22px 0' }}>
          <Button style={buttonStyle} href={APP_URL}>
            Acessar o sistema de frete
          </Button>
        </Section>
        <Text style={footer}>
          Acesse o painel "Aprovação de Logins" no sistema para aprovar ou reprovar o acesso.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: NovoCadastroEmail,
  subject: 'Novo usuário a aprovar Frete Link Serviços',
  displayName: 'Novo cadastro (aprovação de acesso)',
  previewData: {
    nome: 'Maria Souza',
    email: 'maria.souza@empresa.com.br',
    empresa: 'Empresa Exemplo',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Barlow, Arial, sans-serif' }
const container = { padding: '24px', maxWidth: '560px' }
const banner = {
  backgroundColor: '#0f2036',
  borderRadius: '8px',
  padding: '14px 18px',
}
const bannerText = {
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: 700,
  margin: '0',
  letterSpacing: '0.3px',
}
const heading = { fontSize: '19px', color: '#0f2036', margin: '22px 0 6px' }
const text = { fontSize: '14px', color: '#3d4a5c', margin: '0 0 6px' }
const row = { fontSize: '14px', color: '#0f2036', margin: '4px 0' }
const hr = { borderColor: '#e3e8ef', margin: '18px 0' }
const buttonStyle = {
  backgroundColor: '#0f2036',
  borderRadius: '6px',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: 700,
  textDecoration: 'none',
  padding: '12px 22px',
  display: 'inline-block',
}
const footer = { fontSize: '13px', color: '#66738a' }
