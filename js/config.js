// Chaves PÚBLICAS do Supabase (seguras no navegador porque o banco usa RLS).
// NUNCA coloque aqui a "secret key" nem a "service_role".
window.CE_CONFIG={
  url:'https://qdcfjbjaoibuvpzytgih.supabase.co',
  key:'sb_publishable_wmxyBWTrR97OlR-l7lLe0g_zYxS1dVQ',
  // Links de pagamento (Stripe Payment Link, Mercado Pago etc.). Deixe vazio até o provedor estar configurado.
  // O app acrescenta ?client_reference_id=<id do usuário>&prefilled_email=<e-mail> ao link.
  checkout:{
    monthly:'',      // assinatura mensal no cartão (Payment Link com preço recorrente)
    annual:'',       // assinatura anual no cartão
    pix_monthly:'',  // Pix: passe de 30 dias (Payment Link de pagamento único)
    pix_annual:'',   // Pix: passe de 1 ano
    portal:''        // link do Portal do Cliente do Stripe (gerenciar/cancelar assinatura)
  }
};
