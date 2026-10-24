'use client';
// Route "admin/company-preview/:id" → AdminCompanyPreviewComponent: the
// company profile (getCompanyDetails?neat_id=:id): general details, financial
// competence and professionals.
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { MatCard, MatCardHeader, MatCardTitle, MatCardContent } from '@/components/mat/MatCard';
import { adminService } from '@/services';
import { subscribe } from '@/lib/api';
import { useNgOnInit } from '@/lib/useNgOnInit';

export default function AdminCompanyPreviewPage() {
  const { id: neatId } = useParams();
  const [data, setData] = useState({});

  useNgOnInit(() => {
    subscribe(adminService.getCompanyDetails(neatId), (res) =>
      setData({
        available_professional: res['available_professional'],
        company_details: res['company_details'],
        management_competence: res['management_competence'],
        financial_competence: res['financial_competence'],
      }),
    );
  });
  const { available_professional, company_details, financial_competence } = data;

  return (
    <>
      <div className="row mt-4">
        <div className="col-md-12">
          <div className="section-title-wrapper">
            <div className="section-title">
              <h3>{company_details?.name}</h3>
            </div>
          </div>
        </div>
      </div>
      <MatCard className="mat-elevation-z2 mb-4 mr-4 ml-4">
        <MatCardHeader className="text-center card-header" style={{ color: 'white', background: '#E67E22' }}>
          <MatCardTitle className="m-0">
            <b>Company Details</b>
          </MatCardTitle>
        </MatCardHeader>
        <MatCardContent>
          <table className="table table-striped">
            <thead>
              <tr>
                <th scope="col" style={{ width: '45%' }} />
                <th scope="col" style={{ width: '50%' }} />
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Ed-Tech company’s country of origin</td>
                <td> {company_details?.country} </td>
              </tr>
              <tr>
                <td>Ed-Tech company’s years of operation in India</td>
                <td> {company_details?.oper_years_india} </td>
              </tr>
              <tr>
                <td>Ed-Tech company’s legal address in India</td>
                <td> {company_details?.address_india} </td>
              </tr>
              <tr>
                <td> Authorized Representative Name: </td>
                <td> {company_details?.auth_representative_name} </td>
              </tr>
              <tr>
                <td> Authorized Representative Mobile: </td>
                <td> {company_details?.auth_representative_mob} </td>
              </tr>
              <tr>
                <td> Authorized Representative Telephone: </td>
                <td> {company_details?.auth_representative_tel} </td>
              </tr>
              <tr>
                <td> Authorized Representative Email: </td>
                <td> {company_details?.auth_representative_email} </td>
              </tr>
              <tr>
                <td> Authorized Representative Address: </td>
                <td> {company_details?.auth_representative_address} </td>
              </tr>
              <tr>
                <td> Number of Employees in Ed-Tech Company</td>
                <td> {company_details?.no_of_emp} </td>
              </tr>
              <tr>
                <td> Weblink of Ed-Tech company</td>
                <td> {company_details?.website} </td>
              </tr>
              <tr>
                <td> Is your company DIPP registered?</td>
                <td> {company_details?.dipp_registered} </td>
              </tr>
            </tbody>
          </table>
        </MatCardContent>
      </MatCard>
      <MatCard className="mat-elevation-z2 m-4">
        <MatCardHeader className="text-center card-header" style={{ color: 'white', background: '#E67E22' }}>
          <MatCardTitle className="m-0">
            <b>Financial Competence(In Lakhs)</b>
          </MatCardTitle>
        </MatCardHeader>
        <div style={{ overflowX: 'auto' }}>
          <table className="table table-striped">
            <thead>
              <tr>
                <th scope="col" style={{ width: '5%', textAlign: 'center' }}>
                  Sr. No.
                </th>
                <th scope="col" style={{ width: '15%', textAlign: 'center' }}>
                  Financial Year
                </th>
                <th scope="col" style={{ width: '40%', textAlign: 'center' }}>
                  Annual Turnover(INR Equivalent)
                </th>
                <th scope="col" style={{ width: '40%', textAlign: 'center' }}>
                  Annual Turnover From Education Products/Solutions(INR Equivalent)
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ textAlign: 'center' }}>1</td>
                <td style={{ textAlign: 'center' }}>
                  <mat-label> {financial_competence?.year_one} </mat-label>
                </td>
                <td style={{ textAlign: 'center' }}>
                  <mat-label> {financial_competence?.year_one_annual_turn} </mat-label>
                </td>
                <td style={{ textAlign: 'center' }}>
                  <mat-label> {financial_competence?.year_one_education} </mat-label>
                </td>
              </tr>
              <tr>
                <td style={{ textAlign: 'center' }}>2</td>
                <td style={{ textAlign: 'center' }}>
                  <mat-label> {financial_competence?.year_two} </mat-label>
                </td>
                <td style={{ textAlign: 'center' }}>
                  <mat-label> {financial_competence?.year_two_annual_turn} </mat-label>
                </td>
                <td style={{ textAlign: 'center' }}>
                  <mat-label> {financial_competence?.year_two_education} </mat-label>
                </td>
              </tr>
              <tr>
                <td style={{ textAlign: 'center' }}>3</td>
                <td style={{ textAlign: 'center' }}>
                  <mat-label> {financial_competence?.year_three} </mat-label>
                </td>
                <td style={{ textAlign: 'center' }}>
                  <mat-label> {financial_competence?.year_three_annual_turn} </mat-label>
                </td>
                <td style={{ textAlign: 'center' }}>
                  <mat-label> {financial_competence?.year_three_education} </mat-label>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </MatCard>
      <MatCard className="mat-elevation-z2 m-4">
        <MatCardHeader className="text-center card-header" style={{ color: 'white', background: '#E67E22' }}>
          <MatCardTitle className="m-0">
            <b>Profiles of Professionals</b>
          </MatCardTitle>
        </MatCardHeader>
        <table className="table table-responsive table-striped">
          <thead>
            <tr>
              <th scope="col" style={{ textAlign: 'center' }}>
                Sr. No.
              </th>
              <th scope="col" style={{ textAlign: 'center' }}>
                Description
              </th>
              <th scope="col" style={{ textAlign: 'center' }}>
                Total No.
              </th>
              <th scope="col" colSpan="2" style={{ textAlign: 'center' }}>
                Educational Details.
              </th>
              <th scope="col" colSpan="2" style={{ textAlign: 'center' }}>
                Professional Experience: No of professionals having experience in related field
              </th>
            </tr>
            <tr>
              <th scope="col" style={{ textAlign: 'center' }} />
              <th scope="col" style={{ textAlign: 'center' }} />
              <th scope="col" style={{ textAlign: 'center' }} />
              <th scope="col" style={{ textAlign: 'center' }}>
                No. of Doctorate Degree holders (PhD)
              </th>
              <th scope="col" style={{ textAlign: 'center' }}>
                No. of Post Graduate or Graduate Degree holders
              </th>
              <th scope="col" style={{ textAlign: 'center' }}>
                Less than 5 year
              </th>
              <th scope="col" style={{ textAlign: 'center' }}>
                5 years and above
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ textAlign: 'center' }}>1</td>
              <td style={{ textAlign: 'center' }}>Total No. of Professionals</td>
              <td />
              <td />
              <td />
              <td />
              <td />
            </tr>
            <tr>
              <td />
              <td style={{ textAlign: 'center' }}>Regular</td>
              <td style={{ textAlign: 'center' }}> {available_professional?.total_trainer_regular} </td>
              <td style={{ textAlign: 'center' }}> {available_professional?.no_of_phd_regular} </td>
              <td style={{ textAlign: 'center' }}> {available_professional?.no_of_ug_pg_regular} </td>
              <td style={{ textAlign: 'center' }}> {available_professional?.exp_less_five_regular} </td>
              <td style={{ textAlign: 'center' }}> {available_professional?.exp_more_five_regular} </td>
            </tr>
            <tr>
              <td />
              <td style={{ textAlign: 'center' }}>Part Time/Outsourced</td>
              <td style={{ textAlign: 'center' }}> {available_professional?.total_trainer_part_time} </td>
              <td style={{ textAlign: 'center' }}> {available_professional?.no_of_phd_part_time} </td>
              <td style={{ textAlign: 'center' }}> {available_professional?.no_of_ug_pg_part_time} </td>
              <td style={{ textAlign: 'center' }}> {available_professional?.exp_less_five_part_time} </td>
              <td style={{ textAlign: 'center' }}> {available_professional?.exp_more_five_part_time} </td>
            </tr>
            <tr>
              <td>2</td>
              <td style={{ textAlign: 'center' }}>Number of Researchers</td>
              <td style={{ textAlign: 'center' }}> {available_professional?.exp_total_researcher} </td>
              <td style={{ textAlign: 'center' }}> {available_professional?.exp_total_researcher_phd} </td>
              <td style={{ textAlign: 'center' }}> {available_professional?.exp_total_researcher_ug_pg} </td>
              <td style={{ textAlign: 'center' }}> {available_professional?.exp_researcher_less_five} </td>
              <td style={{ textAlign: 'center' }}> {available_professional?.exp_researcher_more_five} </td>
            </tr>
            <tr>
              <td>3</td>
              <td style={{ textAlign: 'center' }}>Number of Technical Experts</td>
              <td style={{ textAlign: 'center' }}> {available_professional?.expert_total} </td>
              <td style={{ textAlign: 'center' }}> {available_professional?.expert_phd} </td>
              <td style={{ textAlign: 'center' }}> {available_professional?.expert_ug_pg} </td>
              <td style={{ textAlign: 'center' }}> {available_professional?.expert_exp_less_five} </td>
              <td style={{ textAlign: 'center' }}> {available_professional?.expert_exp_more_five} </td>
            </tr>
            <tr>
              <td>4</td>
              <td style={{ textAlign: 'center' }}>Number of Administrative and Management Professionals</td>
              <td style={{ textAlign: 'center' }}> {available_professional?.prof_total} </td>
              <td style={{ textAlign: 'center' }}> {available_professional?.prof_phd} </td>
              <td style={{ textAlign: 'center' }}> {available_professional?.prof_ug_pg} </td>
              <td style={{ textAlign: 'center' }}> {available_professional?.prof_exp_less_five} </td>
              <td style={{ textAlign: 'center' }}> {available_professional?.prof_exp_more_five} </td>
            </tr>
          </tbody>
        </table>
      </MatCard>
      <br />
      <br />
    </>
  );
}
