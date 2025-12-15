
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation, useApp } from '../../AppContext';
import { dataService } from '../../services/dataService';
import { Employee } from '../../types';
import { PageHeader } from '../ui/PageHeader';
import { Button } from '../ui/Button';
import { Input, Select } from '../ui/Input';
import { Card, CardContent } from '../ui/Card';
import { Save, Trash2, ArrowLeft } from 'lucide-react';

const EmployeeForm: React.FC = () => {
  const { t } = useTranslation();
  const { showToast } = useApp();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;

  const [formData, setFormData] = useState<Partial<Employee>>({
      name: '',
      role: '',
      department: '',
      status: 'Active',
      joinDate: new Date().toISOString().split('T')[0],
      basicSalary: 0,
      housingAllowance: 0,
      transportAllowance: 0,
      otherAllowances: 0,
      annualLeaveBalance: 21,
      nationality: '',
      nationalId: '',
      phone: '',
      email: '',
      iban: '',
      contractType: 'Full-time'
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isEdit && id) {
        loadEmployee(id);
    }
  }, [id]);

  const loadEmployee = async (empId: string) => {
      const found = await dataService.getEmployeeById(empId);
      if (found) setFormData(found);
  };

  const handleSave = async () => {
      if (!formData.name || !formData.nationalId) {
          showToast(t('msg.fillRequired'), 'error');
          return;
      }

      setLoading(true);
      try {
          if (isEdit && id) {
              await dataService.updateEmployee(id, formData);
              showToast(t('msg.saved'), 'success');
          } else {
              await dataService.addEmployee(formData as Employee);
              showToast(t('msg.saved'), 'success');
          }
          navigate('/hr');
      } catch (e) {
          showToast('Error saving employee', 'error');
      } finally {
          setLoading(false);
      }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
        <PageHeader 
            title={isEdit ? t('hr.editEmployee') : t('hr.addEmployee')} 
            actions={
                <Button variant="ghost" onClick={() => navigate('/hr')}>
                    <ArrowLeft size={16} className="mr-2"/> {t('back')}
                </Button>
            }
        />

        <Card>
            <CardContent className="p-8 space-y-8">
                {/* Personal Info */}
                <div>
                    <h3 className="text-lg font-bold text-text mb-4 border-b border-border pb-2">{t('hr.personalInfo')}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input label={t('hr.fullName')} value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                        <Input label={t('hr.nationalId')} value={formData.nationalId} onChange={e => setFormData({...formData, nationalId: e.target.value})} />
                        <Input label={t('hr.nationality')} value={formData.nationality} onChange={e => setFormData({...formData, nationality: e.target.value})} />
                        <Input label={t('hr.phone')} value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                        <Input label={t('hr.email')} type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                        <Input label={t('hr.joined')} type="date" value={formData.joinDate} onChange={e => setFormData({...formData, joinDate: e.target.value})} />
                    </div>
                </div>

                {/* Employment */}
                <div>
                    <h3 className="text-lg font-bold text-text mb-4 border-b border-border pb-2">{t('hr.employmentDetails')}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Input label={t('hr.jobTitle')} value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} />
                        <Select label={t('hr.department')} value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})}>
                            <option value="">Select Dept</option>
                            <option value="Production">Production</option>
                            <option value="Sales">Sales</option>
                            <option value="HR">HR</option>
                            <option value="Finance">Finance</option>
                            <option value="Management">Management</option>
                        </Select>
                        <Select label={t('hr.status')} value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as any})}>
                            <option value="Active">Active</option>
                            <option value="On Leave">On Leave</option>
                            <option value="Terminated">Terminated</option>
                        </Select>
                        <Select label={t('hr.contractType')} value={formData.contractType} onChange={e => setFormData({...formData, contractType: e.target.value as any})}>
                            <option value="Full-time">Full-time</option>
                            <option value="Part-time">Part-time</option>
                            <option value="Contractor">Contractor</option>
                        </Select>
                        <Input label={t('hr.iban')} value={formData.iban} onChange={e => setFormData({...formData, iban: e.target.value})} />
                    </div>
                </div>

                {/* Payroll */}
                <div>
                    <h3 className="text-lg font-bold text-text mb-4 border-b border-border pb-2">{t('hr.financialPackage')}</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <Input label={t('hr.basic')} type="number" value={formData.basicSalary} onChange={e => setFormData({...formData, basicSalary: Number(e.target.value)})} />
                        <Input label={t('hr.housing')} type="number" value={formData.housingAllowance} onChange={e => setFormData({...formData, housingAllowance: Number(e.target.value)})} />
                        <Input label={t('hr.transport')} type="number" value={formData.transportAllowance} onChange={e => setFormData({...formData, transportAllowance: Number(e.target.value)})} />
                        <Input label={t('hr.other')} type="number" value={formData.otherAllowances} onChange={e => setFormData({...formData, otherAllowances: Number(e.target.value)})} />
                    </div>
                </div>

                <div className="flex justify-end pt-4">
                    <Button onClick={handleSave} loading={loading} size="lg">
                        <Save size={18} className="mr-2"/> {t('btn.save')}
                    </Button>
                </div>
            </CardContent>
        </Card>
    </div>
  );
};

export default EmployeeForm;
