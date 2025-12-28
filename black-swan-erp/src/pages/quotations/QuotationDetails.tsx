
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp, useTranslation } from '../../AppContext';
import { dataService } from '../../services/dataService';
import { Quotation } from '../../types';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Card, CardContent } from '../../components/ui/Card';
import { Printer, Mail, FileSignature } from 'lucide-react';

const QuotationDetails: React.FC = () => {
  const { id } = useParams<{id: string}>();
  const navigate = useNavigate();
    const { showToast } = useApp();
  const { t } = useTranslation();
  const [quotation, setQuotation] = useState<Quotation | null>(null);
    const [converting, setConverting] = useState(false);

  useEffect(() => {
    if (id) {
        dataService.getQuotationById(id).then(q => setQuotation(q));
    }
  }, [id]);

  const handleConvertToContract = async () => {
      if (!quotation || converting) return;
      setConverting(true);
      try {
          const contract = await dataService.convertQuotationToContract(quotation.id);
          if (contract) {
              showToast('Converted to Contract & sent for approval', 'success');
              navigate(`/contracts`);
          } else {
              showToast('Unable to convert quotation', 'error');
          }
      } catch (err: any) {
          showToast(err.message || 'Conversion failed', 'error');
      } finally {
          setConverting(false);
      }
  };

  if (!quotation) return <div>{t('loading')}</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
        <PageHeader 
            title={`Quotation ${quotation.quotationNumber}`} 
            actions={
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => window.print()}><Printer size={16} className="mr-2"/> {t('btn.print')}</Button>
                    {quotation.status === 'PENDING' && (
                        <Button onClick={handleConvertToContract} disabled={converting}>
                            <FileSignature size={16} className="mr-2"/> {converting ? 'Converting...' : 'Convert to Contract'}
                        </Button>
                    )}
                </div>
            }
        />

        <Card className="print:shadow-none print:border-none">
            <CardContent className="p-8 space-y-8">
                <div className="flex justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900">{t('app.name')}</h2>
                        <p className="text-text-muted">Riyadh, Saudi Arabia</p>
                    </div>
                    <div className="text-right">
                        <p className="text-sm uppercase font-bold text-text-muted">{t('col.date')}</p>
                        <p>{quotation.date}</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-8 p-6 bg-secondary/10 rounded-lg border border-border">
                    <div>
                        <p className="text-xs uppercase font-bold text-text-muted mb-1">{t('quotations.billTo')}</p>
                        <p className="font-bold text-lg">{quotation.customerCompany}</p>
                        <p>{quotation.customerName}</p>
                        <p>{quotation.customerPhone}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs uppercase font-bold text-text-muted mb-1">{t('quotations.total')}</p>
                        <p className="font-bold text-3xl text-primary">{quotation.totalAmount.toLocaleString()} {t('currency')}</p>
                        <p className="text-xs text-text-muted">{t('quotations.expiry')}: {quotation.expiryDate}</p>
                    </div>
                </div>

                <table className="w-full text-left text-sm">
                    <thead className="bg-secondary text-text-muted uppercase text-xs">
                        <tr>
                            <th className="p-3">{t('quotations.item')}</th>
                            <th className="p-3 text-center">{t('col.quantity')}</th>
                            <th className="p-3 text-right">{t('quotations.unitPrice')}</th>
                            <p>{quotation.customerAddress}</p>
                            <p>{quotation.customerVat}</p>
                            <th className="p-3 text-right">{t('quotations.total')}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {quotation.items.map((item, i) => (
                            <tr key={i}>
                                <td className="p-3">{item.description}</td>
                                <td className="p-3 text-center">{item.quantity}</td>
                                <td className="p-3 text-right">{item.unitPrice.toLocaleString()}</td>
                                <td className="p-3 text-right font-bold">{item.total.toLocaleString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <div className="flex justify-end pt-4 border-t border-border">
                    <div className="w-64 space-y-2 text-right">
                        <div className="flex justify-between"><span>{t('quotations.subtotal')}:</span> <span>{quotation.subtotal.toLocaleString()}</span></div>
                        <div className="flex justify-between"><span>{t('quotations.vat')}:</span> <span>{quotation.vatAmount.toLocaleString()}</span></div>
                        <div className="flex justify-between font-bold text-lg pt-2 border-t border-border"><span>{t('quotations.total')}:</span> <span>{quotation.totalAmount.toLocaleString()}</span></div>
                    </div>
                </div>
            </CardContent>
        </Card>
    </div>
  );
};

export default QuotationDetails;
