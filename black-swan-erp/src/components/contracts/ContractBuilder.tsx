
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation, useApp } from '../../AppContext';
import { dataService } from '../../services/dataService';
import { Contract, ContractStatus, ContractParty, PaymentTerm, PaymentAmountType, PaymentStatus, PaymentTrigger, ContractClause } from '../../types';
import { PageHeader } from '../ui/PageHeader';
import { Button } from '../ui/Button';
import { Input, Select, Textarea } from '../ui/Input';
import { Card, CardContent } from '../ui/Card';
import { CheckCircle, Building2, User, DollarSign, ChevronLeft, ChevronRight, Save } from 'lucide-react';

const ContractBuilder: React.FC = () => {
  const { t } = useTranslation();
  const { showToast } = useApp();
  const navigate = useNavigate();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [draftContract, setDraftContract] = useState<Partial<Contract>>({
      title: '', 
      totalValue: 0, 
      currency: 'SAR',
      partyA: { legalName: 'Black Swan Factory', representativeName: 'General Manager', email: 'contracts@blackswan.com', address: 'Riyadh Industrial City', phone: '0110000000' },
      partyB: { legalName: '', representativeName: '', email: '', address: '' },
      paymentTerms: [],
      status: ContractStatus.DRAFT
  });

  const handleSave = async () => {
    if (!draftContract.title || !draftContract.partyB?.legalName) {
        showToast(t('msg.fillRequired'), 'error');
        return;
    }

    const contractToSave = {
        ...draftContract,
        id: crypto.randomUUID(),
        contractNumber: `CN-${Date.now().toString().substr(-6)}`,
        clientId: 'new',
        clientName: draftContract.partyB.legalName,
        createdAt: new Date().toISOString(),
        items: [],
        ownerId: 'u1',
        payment1Status: PaymentStatus.PENDING, 
        payment2Status: PaymentStatus.PENDING, 
        startDate: new Date().toISOString().split('T')[0],
        deliveryDate: '2024-01-01',
    } as Contract;

    await dataService.addContract(contractToSave);
    showToast(t('msg.saved'), 'success');
    navigate('/contracts');
  };

  const steps = [
      { num: 1, label: t('contracts.step.parties') },
      { num: 2, label: t('contracts.step.details') },
      { num: 3, label: t('contracts.step.review') }
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader 
        title={t('contracts.builder')} 
        subtitle={t('contracts.builderSubtitle')}
        actions={
            <Button variant="ghost" onClick={() => navigate('/contracts')}>{t('btn.cancel')}</Button>
        }
      />

      {/* Stepper */}
      <div className="flex justify-center mb-8">
          {steps.map(step => (
              <div key={step.num} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${currentStep >= step.num ? 'bg-primary text-white' : 'bg-secondary text-text-muted'}`}>
                      {step.num}
                  </div>
                  <span className={`mx-2 text-sm font-medium ${currentStep >= step.num ? 'text-primary' : 'text-text-muted'}`}>{step.label}</span>
                  {step.num < steps.length && <div className="w-12 h-0.5 bg-border mx-2"></div>}
              </div>
          ))}
      </div>

      <Card>
          <CardContent className="p-8">
              {currentStep === 1 && (
                  <div className="space-y-8 animate-slide-in">
                      <div className="p-6 bg-secondary/30 rounded-xl border border-border">
                          <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Building2 size={20} className="text-primary"/> {t('contracts.partyA')}</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <Input label={t('contracts.legalName')} value={draftContract.partyA?.legalName} onChange={e => setDraftContract({...draftContract, partyA: {...draftContract.partyA!, legalName: e.target.value}})} />
                              <Input label={t('contracts.representative')} value={draftContract.partyA?.representativeName} onChange={e => setDraftContract({...draftContract, partyA: {...draftContract.partyA!, representativeName: e.target.value}})} />
                          </div>
                      </div>
                      
                      <div className="p-6 bg-secondary/30 rounded-xl border border-border">
                          <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><User size={20} className="text-accent"/> {t('contracts.partyB')}</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <Input label={t('contracts.legalName')} value={draftContract.partyB?.legalName} onChange={e => setDraftContract({...draftContract, partyB: {...draftContract.partyB!, legalName: e.target.value}})} />
                              <Input label={t('contracts.representative')} value={draftContract.partyB?.representativeName} onChange={e => setDraftContract({...draftContract, partyB: {...draftContract.partyB!, representativeName: e.target.value}})} />
                              <Input label={t('hr.email')} value={draftContract.partyB?.email} onChange={e => setDraftContract({...draftContract, partyB: {...draftContract.partyB!, email: e.target.value}})} />
                              <Input label={t('hr.phone')} value={draftContract.partyB?.phone} onChange={e => setDraftContract({...draftContract, partyB: {...draftContract.partyB!, phone: e.target.value}})} />
                          </div>
                      </div>
                  </div>
              )}

              {currentStep === 2 && (
                  <div className="space-y-6 animate-slide-in">
                      <Input label={t('contracts.contractTitle')} value={draftContract.title} onChange={e => setDraftContract({...draftContract, title: e.target.value})} placeholder="e.g. Winter Uniform Supply 2024" />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <Input label={t('contracts.totalValue')} type="number" value={draftContract.totalValue} onChange={e => setDraftContract({...draftContract, totalValue: Number(e.target.value)})} />
                          <Select label={t('contracts.currency')} value={draftContract.currency} onChange={e => setDraftContract({...draftContract, currency: e.target.value})}>
                              <option value="SAR">SAR</option>
                              <option value="USD">USD</option>
                          </Select>
                      </div>
                      <Textarea label={t('contracts.scope')} rows={4} placeholder="Describe the deliverables..." />
                  </div>
              )}

              {currentStep === 3 && (
                  <div className="text-center space-y-4 animate-slide-in">
                      <CheckCircle size={64} className="text-success mx-auto" />
                      <h3 className="text-2xl font-bold text-text">{t('contracts.readyToCreate')}</h3>
                      <p className="text-text-muted">{t('contracts.reviewText')}</p>
                      <div className="bg-secondary p-4 rounded-lg text-left max-w-md mx-auto space-y-2 text-sm">
                          <p><strong>{t('contracts.contractTitle')}:</strong> {draftContract.title}</p>
                          <p><strong>{t('col.client')}:</strong> {draftContract.partyB?.legalName}</p>
                          <p><strong>{t('contracts.totalValue')}:</strong> {draftContract.totalValue} {draftContract.currency}</p>
                      </div>
                  </div>
              )}
          </CardContent>
      </Card>

      <div className="flex justify-between pt-4">
          <Button variant="secondary" onClick={() => setCurrentStep(p => Math.max(1, p - 1))} disabled={currentStep === 1}>
              <ChevronLeft size={16} className="mr-2"/> {t('back')}
          </Button>
          
          {currentStep < 3 ? (
              <Button onClick={() => setCurrentStep(p => Math.min(3, p + 1))}>
                  {t('btn.next')} <ChevronRight size={16} className="ml-2"/>
              </Button>
          ) : (
              <Button onClick={handleSave} variant="primary">
                  <Save size={16} className="mr-2"/> {t('btn.createContract')}
              </Button>
          )}
      </div>
    </div>
  );
};

export default ContractBuilder;
