
import { TaxInvoice, InvoiceType } from '../types';

// --- ZATCA PHASE 2 XML UTILS (UBL 2.1) ---

/**
 * Generates a basic UBL 2.1 XML structure for a Standard Tax Invoice.
 * This is a skeleton and needs to be populated with actual data mapping.
 */
export const generateUBLXML = (invoice: TaxInvoice): string => {
  const invoiceTypeCode = invoice.type === InvoiceType.STANDARD ? '388' : '383'; // 388: Tax Invoice, 383: Debit Note, 381: Credit Note
  const profileID = 'reporting:1.0'; // For Standard Invoice (Reporting)
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2" xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2" xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2" xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2">
    <cbc:UBLVersionID>2.1</cbc:UBLVersionID>
    <cbc:ProfileID>${profileID}</cbc:ProfileID>
    <cbc:ID>${invoice.id}</cbc:ID>
    <cbc:UUID>${crypto.randomUUID()}</cbc:UUID>
    <cbc:IssueDate>${invoice.issueDate.split('T')[0]}</cbc:IssueDate>
    <cbc:IssueTime>${invoice.issueDate.split('T')[1] || '00:00:00'}</cbc:IssueTime>
    <cbc:InvoiceTypeCode name="${invoice.type === InvoiceType.SIMPLIFIED ? '0200000' : '0100000'}">${invoiceTypeCode}</cbc:InvoiceTypeCode>
    <cbc:DocumentCurrencyCode>SAR</cbc:DocumentCurrencyCode>
    <cbc:TaxCurrencyCode>SAR</cbc:TaxCurrencyCode>
    
    <!-- Supplier Party -->
    <cac:AccountingSupplierParty>
        <cac:Party>
            <cac:PartyIdentification>
                <cbc:ID schemeID="CRN">${invoice.seller.vatNumber}</cbc:ID> 
            </cac:PartyIdentification>
            <cac:PartyName>
                <cbc:Name>${invoice.seller.legalName}</cbc:Name>
            </cac:PartyName>
            <cac:PartyTaxScheme>
                <cbc:CompanyID>${invoice.seller.vatNumber}</cbc:CompanyID>
                <cac:TaxScheme>
                    <cbc:ID>VAT</cbc:ID>
                </cac:TaxScheme>
            </cac:PartyTaxScheme>
            <cac:PartyLegalEntity>
                <cbc:RegistrationName>${invoice.seller.legalName}</cbc:RegistrationName>
            </cac:PartyLegalEntity>
        </cac:Party>
    </cac:AccountingSupplierParty>
    
    <!-- Customer Party -->
    <cac:AccountingCustomerParty>
        <cac:Party>
            <cac:PartyLegalEntity>
                <cbc:RegistrationName>${invoice.buyer.name}</cbc:RegistrationName>
            </cac:PartyLegalEntity>
        </cac:Party>
    </cac:AccountingCustomerParty>

    <!-- Totals -->
    <cac:LegalMonetaryTotal>
        <cbc:LineExtensionAmount currencyID="SAR">${invoice.subtotal.toFixed(2)}</cbc:LineExtensionAmount>
        <cbc:TaxExclusiveAmount currencyID="SAR">${invoice.subtotal.toFixed(2)}</cbc:TaxExclusiveAmount>
        <cbc:TaxInclusiveAmount currencyID="SAR">${invoice.totalAmount.toFixed(2)}</cbc:TaxInclusiveAmount>
        <cbc:AllowanceTotalAmount currencyID="SAR">0.00</cbc:AllowanceTotalAmount>
        <cbc:PrepaidAmount currencyID="SAR">0.00</cbc:PrepaidAmount>
        <cbc:PayableAmount currencyID="SAR">${invoice.totalAmount.toFixed(2)}</cbc:PayableAmount>
    </cac:LegalMonetaryTotal>
    
    <!-- Invoice Lines -->
    ${invoice.items.map((item, index) => `
    <cac:InvoiceLine>
        <cbc:ID>${index + 1}</cbc:ID>
        <cbc:InvoicedQuantity unitCode="PCE">${item.quantity}</cbc:InvoicedQuantity>
        <cbc:LineExtensionAmount currencyID="SAR">${(item.quantity * item.unitPrice).toFixed(2)}</cbc:LineExtensionAmount>
        <cac:TaxTotal>
            <cbc:TaxAmount currencyID="SAR">${(item.quantity * item.unitPrice * 0.15).toFixed(2)}</cbc:TaxAmount>
            <cbc:RoundingAmount currencyID="SAR">${(item.quantity * item.unitPrice * 0.15).toFixed(2)}</cbc:RoundingAmount>
        </cac:TaxTotal>
        <cac:Item>
            <cbc:Name>${item.description}</cbc:Name>
        </cac:Item>
        <cac:Price>
            <cbc:PriceAmount currencyID="SAR">${item.unitPrice.toFixed(2)}</cbc:PriceAmount>
        </cac:Price>
    </cac:InvoiceLine>
    `).join('')}
</Invoice>`;
};

/**
 * Placeholder for Digital Signature generation.
 * In a real implementation, this would sign the XML hash using a private key.
 */
export const signInvoiceXML = async (xmlContent: string, privateKey: string): Promise<string> => {
    // 1. Canonicalize XML
    // 2. Hash Canonicalized XML
    // 3. Sign Hash with Private Key
    // 4. Embed Signature in UBL Extension
    return xmlContent; // Return unsigned for now
};
