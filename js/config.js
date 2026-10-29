// Chaves PÚBLICAS do Supabase (seguras no navegador porque o banco usa RLS).
// NUNCA coloque aqui a "secret key" nem a "service_role".
window.CE_CONFIG={
  url:'https://qdcfjbjaoibuvpzytgih.supabase.co',
  key:'sb_publishable_wmxyBWTrR97OlR-l7lLe0g_zYxS1dVQ',
  // Links de pagamento (Stripe Payment Link, Mercado Pago etc.). Deixe vazio até o provedor estar configurado.
  // O app acrescenta ?client_reference_id=<id do usuário>&prefilled_email=<e-mail> ao link.
  checkout:{monthly:'',annual:''}
};
