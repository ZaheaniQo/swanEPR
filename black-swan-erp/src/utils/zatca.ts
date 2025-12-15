
import { TaxInvoice } from '../types';

// --- CRYPTOGRAPHIC UTILS ---

async function sha256(message: string): Promise<string> {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return btoa(String.fromCharCode(...hashArray)); // Return Base64
}

// --- TLV QR GENERATOR (ZATCA PHASE 1) ---

function getTLV(tag: number, value: string): Uint8Array {
  const valBuffer = new TextEncoder().encode(value);
  const len = valBuffer.length;
  const tagBuf = new Uint8Array([tag]);
  const lenBuf = new Uint8Array([len]);
  const combined = new Uint8Array(tagBuf.length + lenBuf.length + valBuffer.length);
  combined.set(tagBuf);
  combined.set(lenBuf, tagBuf.length);
  combined.set(valBuffer, tagBuf.length + lenBuf.length);
  return combined;
}

export const generateTLVQR = (invoice: TaxInvoice): string => {
    const sellerName = invoice.seller.legalName;
    const vatNumber = invoice.seller.vatNumber;
    const timestamp = invoice.issueDate; // ISO 8601
    const total = invoice.totalAmount.toFixed(2);
    const vat = invoice.vatAmount.toFixed(2);

    // Tags: 1=Seller, 2=VAT No, 3=Time, 4=Total, 5=VAT Total
    const tags = [
        getTLV(1, sellerName),
        getTLV(2, vatNumber),
        getTLV(3, timestamp),
        getTLV(4, total),
        getTLV(5, vat)
        // Phase 2 requires: 6=Hash, 7=Signature, 8=PublicKey, 9=Certificate (if simplified)
    ];

    const totalLen = tags.reduce((acc, curr) => acc + curr.length, 0);
    const result = new Uint8Array(totalLen);
    let offset = 0;
    for (const tag of tags) {
        result.set(tag, offset);
        offset += tag.length;
    }

    // Convert to Base64
    let binary = '';
    const len = result.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(result[i]);
    }
    return btoa(binary);
};

// --- UBL 2.1 XML GENERATOR (ZATCA PHASE 2 PREP) ---

const formatDate = (dateStr: string) => dateStr.split('T')[0];
const formatTime = (dateStr: string) => {
    try {
        const date = new Date(dateStr);
        return date.toISOString().split('T')[1].split('.')[0];
    } catch (e) {
        return '00:00:00';
    }
};

export const generateZATCAXML = async (invoice: TaxInvoice, previousHash: string = "NWZlYTY0MGNhZTM..."): Promise<{ xml: string, hash: string }> => {
    const uuid = invoice.zatcaUuid || crypto.randomUUID();
    const issueDate = formatDate(invoice.issueDate);
    const issueTime = formatTime(invoice.issueDate);
    const currency = invoice.currency || 'SAR';
    const icv = invoice.zatca?.icv || 1;

    // Buyer Info Logic
    const buyerAny = invoice.buyer as any;
    const buyerName = buyerAny.legalName || buyerAny.name || 'Cash Customer';
    const buyerVat = buyerAny.vatNumber || '';
    
    // Simplistic XML Construction for Hash Calculation
    // In production, use a proper XML builder library ensuring canonicalization
    const invoiceLines = invoice.items.map((item, index) => `
    <cac:InvoiceLine>
        <cbc:ID>${index + 1}</cbc:ID>
        <cbc:InvoicedQuantity unitCode="PCE">${item.quantity}</cbc:InvoicedQuantity>
        <cbc:LineExtensionAmount currencyID="${currency}">${item.netAmount.toFixed(2)}</cbc:LineExtensionAmount>
        <cac:TaxTotal>
            <cbc:TaxAmount currencyID="${currency}">${item.vatAmount.toFixed(2)}</cbc:TaxAmount>
            <cbc:RoundingAmount currencyID="${currency}">${(item.netAmount + item.vatAmount).toFixed(2)}</cbc:RoundingAmount>
        </cac:TaxTotal>
        <cac:Item>
            <cbc:Name>${item.description}</cbc:Name>
            <cac:ClassifiedTaxCategory>
                <cbc:ID>S</cbc:ID>
                <cbc:Percent>15.00</cbc:Percent>
                <cac:TaxScheme>
                    <cbc:ID>VAT</cbc:ID>
                </cac:TaxScheme>
            </cac:ClassifiedTaxCategory>
        </cac:Item>
        <cac:Price>
            <cbc:PriceAmount currencyID="${currency}">${item.unitPrice.toFixed(2)}</cbc:PriceAmount>
        </cac:Price>
    </cac:InvoiceLine>`).join('');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2" xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2" xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2" xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2">
    <cbc:ProfileID>reporting:1.0</cbc:ProfileID>
    <cbc:ID>${invoice.invoiceNumber}</cbc:ID>
    <cbc:UUID>${uuid}</cbc:UUID>
    <cbc:IssueDate>${issueDate}</cbc:IssueDate>
    <cbc:IssueTime>${issueTime}</cbc:IssueTime>
    <cbc:InvoiceTypeCode name="0100000">388</cbc:InvoiceTypeCode>
    <cbc:DocumentCurrencyCode>${currency}</cbc:DocumentCurrencyCode>
    <cbc:TaxCurrencyCode>${currency}</cbc:TaxCurrencyCode>
    <cac:AdditionalDocumentReference>
        <cbc:ID>ICV</cbc:ID>
        <cbc:UUID>${icv}</cbc:UUID>
    </cac:AdditionalDocumentReference>
    <cac:AdditionalDocumentReference>
        <cbc:ID>PIH</cbc:ID>
        <cac:Attachment>
            <cbc:EmbeddedDocumentBinaryObject mimeCode="text/plain">${previousHash}</cbc:EmbeddedDocumentBinaryObject>
        </cac:Attachment>
    </cac:AdditionalDocumentReference>
    <cac:AccountingSupplierParty>
        <cac:Party>
            <cac:PartyIdentification>
                <cbc:ID schemeID="CRN">${invoice.seller.crNumber}</cbc:ID>
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
        </cac:Party>
    </cac:AccountingSupplierParty>
    <cac:AccountingCustomerParty>
        <cac:Party>
            <cac:PartyName>
                <cbc:Name>${buyerName}</cbc:Name>
            </cac:PartyName>
            ${buyerVat ? `
            <cac:PartyTaxScheme>
                <cbc:CompanyID>${buyerVat}</cbc:CompanyID>
                <cac:TaxScheme>
                    <cbc:ID>VAT</cbc:ID>
                </cac:TaxScheme>
            </cac:PartyTaxScheme>` : ''}
        </cac:Party>
    </cac:AccountingCustomerParty>
    <cac:TaxTotal>
        <cbc:TaxAmount currencyID="${currency}">${invoice.vatAmount.toFixed(2)}</cbc:TaxAmount>
        <cac:TaxSubtotal>
            <cbc:TaxableAmount currencyID="${currency}">${invoice.subtotal.toFixed(2)}</cbc:TaxableAmount>
            <cbc:TaxAmount currencyID="${currency}">${invoice.vatAmount.toFixed(2)}</cbc:TaxAmount>
            <cac:TaxCategory>
                <cbc:ID>S</cbc:ID>
                <cbc:Percent>15.00</cbc:Percent>
                <cac:TaxScheme>
                    <cbc:ID>VAT</cbc:ID>
                </cac:TaxScheme>
            </cac:TaxCategory>
        </cac:TaxSubtotal>
    </cac:TaxTotal>
    <cac:LegalMonetaryTotal>
        <cbc:LineExtensionAmount currencyID="${currency}">${invoice.subtotal.toFixed(2)}</cbc:LineExtensionAmount>
        <cbc:TaxExclusiveAmount currencyID="${currency}">${invoice.subtotal.toFixed(2)}</cbc:TaxExclusiveAmount>
        <cbc:TaxInclusiveAmount currencyID="${currency}">${invoice.totalAmount.toFixed(2)}</cbc:TaxInclusiveAmount>
        <cbc:AllowanceTotalAmount currencyID="${currency}">0.00</cbc:AllowanceTotalAmount>
        <cbc:PayableAmount currencyID="${currency}">${invoice.totalAmount.toFixed(2)}</cbc:PayableAmount>
    </cac:LegalMonetaryTotal>
    ${invoiceLines}
</Invoice>`;

    // Calculate Hash (Simplified for MVP, real ZATCA requires canonicalization steps)
    const hash = await sha256(xml);

    return { xml: xml.trim(), hash };
};
