import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../utils/api';
import KYCModal from '../components/KYCModal';
import { mockFarmerFarms, cropTypes, nigeriaStates } from '../data/mockData';
import EmptyState from '../components/EmptyState';
import DashboardLayout from '../components/DashboardLayout';
import CurrencyInput from '../components/CurrencyInput';
import Pagination from '../components/Pagination';

const navItems = [
  { key: 'farms', label: 'My Farms', icon: 'farms' },
  { key: 'add', label: 'Add Farm', icon: 'add' },
  { key: 'milestones', label: 'Milestones', icon: 'milestones' },
  { key: 'harvest', label: 'Harvest Reports', icon: 'harvest' },
  { key: 'explore', label: 'Explore Farms', icon: 'explore' },
  { key: 'settings', label: 'Settings', icon: 'settings' },
];

// ─── CROP REFERENCE (mock — replace with API) ─────────────────────────────
const CROP_REF = {
  Cassava: { costMin:150000, costMax:250000, yieldMin:8, yieldMax:15, unit:'tons', priceMin:60000, priceMax:90000, monthsMin:9, monthsMax:12, maxReturn:20, states:['Oyo','Osun','Ondo','Delta','Rivers','Benue','Anambra','Edo','Cross River'], milestones:[{name:'Land preparation & planting',pct:35,week:1},{name:'Fertiliser & weed control',pct:30,week:8},{name:'Pest & disease management',pct:15,week:20},{name:'Harvest & processing',pct:20,week:40}] },
  Maize:   { costMin:120000, costMax:200000, yieldMin:2, yieldMax:4,  unit:'tons', priceMin:180000,priceMax:260000,monthsMin:3, monthsMax:4,  maxReturn:22, states:['Kaduna','Kano','Plateau','Benue','Ogun','Oyo','Lagos','Kwara','Niger'], milestones:[{name:'Land preparation',pct:30,week:1},{name:'Planting & fertilising',pct:35,week:2},{name:'Weeding & pest control',pct:20,week:6},{name:'Harvest',pct:15,week:14}] },
  Rice:    { costMin:200000, costMax:350000, yieldMin:2.5,yieldMax:5, unit:'tons', priceMin:300000,priceMax:450000,monthsMin:4, monthsMax:6,  maxReturn:18, states:['Kebbi','Niger','Anambra','Ebonyi','Benue','Taraba','Sokoto'], milestones:[{name:'Field preparation',pct:25,week:1},{name:'Transplanting & fertilising',pct:35,week:3},{name:'Weeding & irrigation',pct:25,week:8},{name:'Harvest & milling',pct:15,week:20}] },
  Tomato:  { costMin:300000, costMax:500000, yieldMin:8, yieldMax:20, unit:'tons', priceMin:50000, priceMax:150000,monthsMin:3, monthsMax:4,  maxReturn:25, states:['Kano','Kaduna','Plateau','Benue','Ogun','Lagos'], milestones:[{name:'Nursery & land prep',pct:30,week:1},{name:'Transplanting',pct:25,week:3},{name:'Fertilising & staking',pct:25,week:5},{name:'Harvest',pct:20,week:12}] },
  Yam:     { costMin:250000, costMax:400000, yieldMin:4, yieldMax:10, unit:'tons', priceMin:120000,priceMax:200000,monthsMin:6, monthsMax:10, maxReturn:20, states:['Benue','Taraba','Plateau','Nasarawa','Oyo','Ekiti','Kogi'], milestones:[{name:'Land clearing & mounding',pct:35,week:1},{name:'Planting & staking',pct:30,week:2},{name:'Weeding & mulching',pct:20,week:12},{name:'Harvest',pct:15,week:32}] },
  Poultry: { costMin:180000, costMax:300000, yieldMin:500,yieldMax:1000,unit:'birds',priceMin:2000,  priceMax:4000,  monthsMin:2, monthsMax:3,  maxReturn:28, states:['Lagos','Ogun','Oyo','Kaduna','Kano','Rivers','FCT','Abuja'], milestones:[{name:'Housing & equipment',pct:25,week:1},{name:'Chick procurement',pct:30,week:2},{name:'Feed & vaccination',pct:30,week:4},{name:'Sale & processing',pct:15,week:10}] },
};

function LiveLocationCapture({ onLocationCapture, onClear }) {
  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState(null);
  const [location, setLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);

  const handleCapture = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPhoto(file);
    setPreview(URL.createObjectURL(file));
    setLocation(null);
    setLocationError(null);

    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { latitude: pos.coords.latitude, longitude: pos.coords.longitude, accuracy: pos.coords.accuracy };
        setLocation(loc);
        onLocationCapture(loc, file);
      },
      () => setLocationError("Location access denied. Please enable location services."),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  };

  return (
    <div style={{ padding: '16px', background: 'var(--color-primary-light)', border: '1px solid var(--color-primary)', borderRadius: '8px', marginBottom: '16px' }}>
      <h4 style={{fontSize:'14px',fontWeight:600,color:'var(--color-primary)',marginBottom:'8px'}}>Live Farm Location Verification</h4>
      <p style={{fontSize:'12px',color:'var(--color-text-secondary)',marginBottom:'12px',lineHeight:1.4}}>Take a live picture at the farm to verify its GPS coordinates. This anchors your farm on AgriFlow. (Will not be shown to investors)</p>
      
      {!preview ? (
        <label style={{ display: "block", cursor: "pointer", textAlign: "center", padding: "12px", borderRadius: "8px", background:'#fff', border:'1px solid var(--color-primary)' }}>
          <input type="file" accept="image/*" capture="environment" onChange={handleCapture} style={{ display: "none" }} />
          <div className="btn btn-solid btn-sm" style={{ pointerEvents:'none' }}>📷 Capture Location & Photo</div>
        </label>
      ) : (
        <div style={{ display: "flex", gap: "12px", alignItems:'center', background:'#fff', padding:'10px', borderRadius:'8px' }}>
          <img src={preview} alt="Location proof" style={{ width: "50px", height: "50px", objectFit: "cover", borderRadius: "4px", border:'1px solid var(--color-border)' }} />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
            {location ? (
              <div style={{ fontSize: "12px", color: "var(--color-primary)", fontWeight: 600 }}>
                ✓ Location captured ({location.accuracy.toFixed(0)}m accuracy)
              </div>
            ) : locationError ? (
              <div style={{ fontSize: "12px", color: "var(--color-danger)" }}>
                ✗ {locationError}
              </div>
            ) : (
              <div style={{ fontSize: "12px", color: "var(--color-text-secondary)" }}>
                ⏳ Acquiring GPS location...
              </div>
            )}
            <div style={{marginTop:'4px'}}><button onClick={() => { setPhoto(null); setPreview(null); setLocation(null); setLocationError(null); onClear(); }} className="btn-link" style={{ fontSize: "12px", padding:0 }}>Retake</button></div>
          </div>
        </div>
      )}
    </div>
  );
}

function FarmCreationForm({ onDone }) {
  const [step, setStep] = useState(1);
  const [data, setData] = useState({ name:'', crop:'', state:'', lga:'', size:'', description:'', photos:[], stages:[], totalBudget:'', startDate:'', endDate:'', expectedYield:'', salePrice:'', returnRate:'', location:null, locationPhoto:null });
  const [crops, setCrops] = useState([]);
  const [loadingCrops, setLoadingCrops] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { addToast } = useToast();
  const { user } = useAuth();
  const kycComplete = user?.bvn_verified && user?.bank_verified;
  const steps = ['Details','Budget','Timeline','Review', 'Upload'];
  const u = (k,v) => setData(p=>({...p,[k]:v}));
  const us = (i,k,v) => { const s=[...data.stages]; s[i]={...s[i],[k]:v}; setData(p=>({...p,stages:s})); };
  const {getRootProps,getInputProps} = useDropzone({ 
    accept:{'image/*':[]}, 
    onDrop: files => {
      // Create preview URLs for display
      const newPhotos = files.map(f => Object.assign(f, { preview: URL.createObjectURL(f) }));
      u('photos', [...data.photos, ...newPhotos]);
    }
  });

  useEffect(() => {
    api.get('/crops')
      .then(res => {
        setCrops(res.data);
        setLoadingCrops(false);
      })
      .catch(() => {
        addToast("Failed to load crop references", "error");
        setLoadingCrops(false);
      });
  }, []);

  const selectedCropObj = crops.find(c => c.name === data.crop);
  const ref = data.crop ? CROP_REF[data.crop] : null;
  const sz = parseFloat(data.size) || 0;
  const budgetMax = ref && sz ? ref.costMax * sz * 1.2 : null;
  const totalBudget = parseFloat(data.totalBudget) || 0;
  const stageTotal = data.stages.reduce((s,st)=>s+(parseFloat(st.amount)||0),0);
  const budgetWarn = budgetMax && totalBudget > budgetMax;
  const stageMismatch = totalBudget>0 && Math.abs(stageTotal-totalBudget)>totalBudget*0.05;
  const revMin = ref && sz ? (ref.yieldMin*sz*ref.priceMin) : null;
  const revMax = ref && sz ? (ref.yieldMax*sz*ref.priceMax) : null;

  // When crop or size changes → update stages from template
  useEffect(() => {
    if (!ref || !totalBudget) return;
    const generated = ref.milestones.map(m => ({ name: m.name, amount: Math.round(totalBudget * m.pct / 100).toString(), locked: true }));
    setData(p => ({...p, stages: generated}));
  }, [data.crop]);

  const handleSubmit = async () => {
    if (!selectedCropObj) return addToast("Please select a valid crop", "error");
    if (!data.location || !data.locationPhoto) return addToast("Please capture farm location and photo", "error");

    // Validate all required numeric fields before submitting
    const farmSizeHa = parseFloat(data.size);
    const totalBudget = parseInt(data.totalBudget);
    const expectedYield = parseFloat(data.expectedYield);
    const salePricePerUnit = parseInt(data.salePrice);
    const returnRate = parseFloat(data.returnRate);

    if (!data.name || data.name.trim().length < 3) return addToast("Farm name must be at least 3 characters", "error");
    if (!data.state) return addToast("Please select a state", "error");
    if (!data.lga) return addToast("Please enter an LGA", "error");
    if (isNaN(farmSizeHa) || farmSizeHa <= 0) return addToast("Please enter a valid farm size", "error");
    if (!data.description || data.description.trim().length < 20) return addToast("Description must be at least 20 characters", "error");
    if (isNaN(totalBudget) || totalBudget <= 0) return addToast("Please enter a valid total budget", "error");
    if (isNaN(expectedYield) || expectedYield <= 0) return addToast("Please enter a valid expected yield", "error");
    if (isNaN(salePricePerUnit) || salePricePerUnit <= 0) return addToast("Please enter a valid sale price per unit", "error");
    if (isNaN(returnRate) || returnRate <= 0) return addToast("Please enter a valid return rate", "error");
    if (!data.startDate) return addToast("Please select a start date", "error");
    if (!data.endDate) return addToast("Please select a harvest date", "error");

    setIsSubmitting(true);
    try {
      // 1. Create Farm Record (Draft)
      const farmPayload = {
        crop_reference_id: selectedCropObj.id,
        name: data.name,
        state: data.state,
        lga: data.lga,
        farm_size_ha: farmSizeHa,
        description: data.description,
        total_budget: totalBudget,
        expected_yield: expectedYield,
        sale_price_per_unit: salePricePerUnit,
        return_rate: returnRate / 100,
        start_date: data.startDate,
        harvest_date: data.endDate
      };

      const createRes = await api.post('/farms/', farmPayload);
      const farmId = createRes.data.data.id;

      // 2. Upload Files & Location (Finalize Submission)
      const formData = new FormData();
      formData.append('latitude', data.location.latitude);
      formData.append('longitude', data.location.longitude);
      formData.append('location_photo', data.locationPhoto);
      
      data.photos.forEach(file => {
        formData.append('display_photos', file);
      });

      await api.post(`/farms/${farmId}/uploads`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      addToast('Farm submitted for review!', 'success', 'All details and photos uploaded successfully.');
      onDone();
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.message || err.response?.data?.detail || "Submission failed";
      addToast(msg, "error");
      
      if (err.response?.status === 403 && msg.toLowerCase().includes('kyc')) {
        // Handled by layout but just in case
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadingCrops) return <div style={{padding:'40px', textAlign:'center'}}>Loading crop data...</div>;

  return (
    <div className="farm-form card">
      <div className="form-steps">
        {steps.map((s,i)=>(
          <span key={s} style={{display:'flex',alignItems:'center',gap:'6px'}}>
            <span className={`fstep${step===i+1?' act':step>i+1?' done':''}`}>{step>i+1?'✓':i+1}</span>
            <span style={{fontSize:'13px',color:'var(--color-text-secondary)'}}>{s}</span>
            {i<steps.length-1 && <span style={{width:'16px',height:'2px',background:'var(--color-border)',display:'inline-block'}}/>}
          </span>
        ))}
      </div>

      {step===1 && (
        <div className="fsec">
          <h3 className="fstitle">Farm Details</h3>
          <div className="form-group"><label className="form-label">Farm Name</label><input className="form-input" value={data.name} onChange={e=>u('name',e.target.value)} placeholder="e.g. Oduya Cassava Farm"/></div>
          <div className="frow">
            <div className="form-group"><label className="form-label">Crop</label>
              <select className="form-input form-select" value={data.crop} onChange={e=>u('crop',e.target.value)}>
                <option value="">Select crop</option>
                {crops.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </div>
            <div className="form-group"><label className="form-label">State</label>
              <select className="form-input form-select" value={data.state} onChange={e=>u('state',e.target.value)}>
                <option value="">Select state</option>
                {(ref ? ref.states : nigeriaStates).map(s=><option key={s}>{s}</option>)}
              </select>
              {ref && data.state && !ref.states.includes(data.state) && (
                <p style={{fontSize:'12px',color:'var(--color-danger)',marginTop:'4px'}}>⚠ {data.crop} is not commonly grown in {data.state}</p>
              )}
            </div>
          </div>
          <div className="frow">
            <div className="form-group"><label className="form-label">LGA</label><input className="form-input" value={data.lga} onChange={e=>u('lga',e.target.value)} placeholder="Local Government Area"/></div>
            <div className="form-group"><label className="form-label">Farm Size (ha)</label><input className="form-input" type="number" value={data.size} onChange={e=>u('size',e.target.value)} placeholder="e.g. 2"/></div>
          </div>

          {ref && sz>0 && (
            <div style={{background:'var(--color-primary-light)',border:'1px solid var(--color-primary)',borderRadius:'12px',padding:'16px 20px'}}>
              <p style={{fontWeight:700,fontSize:'13px',color:'var(--color-primary)',marginBottom:'10px',display:'flex',alignItems:'center',gap:'6px'}}>🌱 AgriFlow suggests for {data.crop} · {sz} ha</p>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'6px 20px',fontSize:'13px'}}>
                {[['Budget range',`₦${(ref.costMin*sz).toLocaleString()} – ₦${(ref.costMax*sz).toLocaleString()}`],
                  ['Expected yield',`${ref.yieldMin*sz} – ${ref.yieldMax*sz} ${ref.unit}`],
                  ['Revenue estimate',`₦${(revMin/1000).toFixed(0)}k – ₦${(revMax/1000000).toFixed(1)}M`],
                  ['Growing period',`${ref.monthsMin} – ${ref.monthsMax} months`],
                  ['Max return rate',`${ref.maxReturn}%`],
                ].map(([l,v])=>(
                  <div key={l} style={{display:'flex',flexDirection:'column',gap:'1px'}}>
                    <span style={{color:'var(--color-text-secondary)',fontSize:'11px'}}>{l}</span>
                    <span style={{fontWeight:600,color:'var(--color-primary)'}}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="form-group"><label className="form-label">Description</label><textarea className="form-input form-textarea" rows={4} value={data.description} onChange={e=>u('description',e.target.value)} placeholder="Describe your farm for investors…"/></div>
        </div>
      )}

      {step===2 && (
        <div className="fsec">
          <h3 className="fstitle">Budget Breakdown</h3>
          {ref && sz>0 && (
            <div style={{padding:'10px 14px',background:'var(--color-primary-light)',borderRadius:'8px',fontSize:'13px',color:'var(--color-primary)',marginBottom:'4px'}}>
              Reference budget: <strong>₦{(ref.costMin*sz).toLocaleString()} – ₦{(ref.costMax*sz).toLocaleString()}</strong> for {sz}ha of {data.crop}
            </div>
          )}
          <div className="form-group">
            <label className="form-label">Total Budget (₦)</label>
            <input className="form-input text-mono" type="number" value={data.totalBudget} onChange={e=>{
              const v=e.target.value; u('totalBudget',v);
              if(ref && data.stages.length>0){
                const b=parseFloat(v)||0;
                setData(p=>({...p,totalBudget:v,stages:ref.milestones.map(m=>({name:m.name,amount:Math.round(b*m.pct/100).toString(),locked:true}))}));
              }
            }} placeholder="e.g. 400000"/>
            {budgetWarn && <p style={{fontSize:'12px',color:'var(--color-danger)',marginTop:'4px'}}>⚠ Exceeds reference max by &gt;20% for this crop and farm size</p>}
          </div>

          {ref ? (
            <>
              <p style={{fontSize:'12px',color:'var(--color-text-secondary)',marginBottom:'6px'}}>Stages are pre-set from the {data.crop} template. Amounts adjust automatically.</p>
              <div style={{display:'flex',flexDirection:'column',gap:'10px',margin:'4px 0'}}>
                {data.stages.map((st,i)=>(
                  <div key={i} style={{display:'flex',gap:'10px',alignItems:'center'}}>
                    <input className="form-input" value={st.name} readOnly style={{flex:1,background:'var(--color-surface)',cursor:'default',color:'var(--color-text-secondary)'}}/>
                    <span className="form-input text-mono" style={{width:'160px',background:'var(--color-surface)',display:'flex',alignItems:'center',color:'var(--color-text-primary)',fontWeight:600}}>₦{(parseInt(st.amount)||0).toLocaleString()}</span>
                    <span style={{fontSize:'11px',color:'var(--color-primary)',background:'var(--color-primary-light)',padding:'2px 8px',borderRadius:'4px',whiteSpace:'nowrap'}}>{ref.milestones[i]?.pct}%</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <div style={{display:'flex',flexDirection:'column',gap:'10px',margin:'8px 0'}}>
                {data.stages.map((st,i)=>(
                  <div key={i} style={{display:'flex',gap:'10px',alignItems:'center'}}>
                    <input className="form-input" value={st.name} onChange={e=>us(i,'name',e.target.value)} placeholder="Stage" style={{flex:1}}/>
                    <input className="form-input text-mono" type="number" value={st.amount} onChange={e=>us(i,'amount',e.target.value)} placeholder="Amount" style={{width:'140px'}}/>
                    <button style={{color:'var(--color-danger)',background:'none',border:'none',cursor:'pointer',fontSize:'16px'}} onClick={()=>setData(p=>({...p,stages:p.stages.filter((_,j)=>j!==i)}))}>✕</button>
                  </div>
                ))}
                <button className="btn-link" onClick={()=>setData(p=>({...p,stages:[...p.stages,{name:'',amount:''}]}))}>+ Add Stage</button>
              </div>
              {stageMismatch && <div style={{padding:'10px 14px',background:'var(--color-accent-light)',borderRadius:'8px',fontSize:'13px',color:'var(--color-accent)'}}>⚠ Stage totals (₦{stageTotal.toLocaleString()}) don't match budget (₦{totalBudget.toLocaleString()})</div>}
            </>
          )}

          <div style={{marginTop:'12px'}}>
            {data.stages.filter(s=>s.amount).map((s,i)=>{
              const pct=totalBudget>0?((parseFloat(s.amount)||0)/totalBudget*100).toFixed(1):0;
              return <div key={i} style={{marginBottom:'8px'}}><div style={{display:'flex',justifyContent:'space-between',fontSize:'12px',marginBottom:'3px'}}><span>{s.name}</span><span className="text-mono">{pct}%</span></div><div className="progress-track" style={{height:'4px'}}><div className="progress-fill" style={{width:`${pct}%`}}/></div></div>;
            })}
          </div>
        </div>
      )}

      {step===3 && (
        <div className="fsec">
          <h3 className="fstitle">Timeline &amp; Yields</h3>
          {ref && <div style={{padding:'10px 14px',background:'var(--color-primary-light)',borderRadius:'8px',fontSize:'13px',color:'var(--color-primary)',marginBottom:'4px'}}>Growing period for {data.crop}: <strong>{ref.monthsMin}–{ref.monthsMax} months</strong> · Max return rate: <strong>{ref.maxReturn}%</strong></div>}
          <div className="frow">
            <div className="form-group"><label className="form-label">Start Date</label><input className="form-input" type="date" value={data.startDate} onChange={e=>u('startDate',e.target.value)}/></div>
            <div className="form-group"><label className="form-label">Harvest Date <span style={{fontSize:'11px',color:'var(--color-text-secondary)'}}>(= Investment Deadline)</span></label><input className="form-input" type="date" value={data.endDate} onChange={e=>u('endDate',e.target.value)}/></div>
          </div>
          <div className="frow">
            <div className="form-group">
              <label className="form-label">Expected Yield ({ref?.unit||'tons'})
                {ref && sz>0 && <span style={{fontSize:'11px',color:'var(--color-text-secondary)',marginLeft:'6px'}}>ref: {ref.yieldMin*sz}–{ref.yieldMax*sz}</span>}
              </label>
              <input className="form-input" type="number" value={data.expectedYield} onChange={e=>u('expectedYield',e.target.value)} placeholder={ref&&sz?`e.g. ${((ref.yieldMin+ref.yieldMax)/2*sz).toFixed(1)}`:'e.g. 4.2'}/>
              {ref && sz>0 && parseFloat(data.expectedYield)>ref.yieldMax*sz*1.3 && (
                <p style={{fontSize:'12px',color:'var(--color-danger)',marginTop:'4px'}}>⚠ Exceeds reference max yield for this farm size</p>
              )}
            </div>
            <div className="form-group"><label className="form-label">Sale Price per {ref?.unit||'ton'} (₦)
              {ref && <span style={{fontSize:'11px',color:'var(--color-text-secondary)',marginLeft:'6px'}}>ref: ₦{(ref.priceMin/1000).toFixed(0)}k–₦{(ref.priceMax/1000).toFixed(0)}k</span>}
              </label>
              <input className="form-input text-mono" type="number" value={data.salePrice} onChange={e=>u('salePrice',e.target.value)} placeholder={ref?`e.g. ${Math.round((ref.priceMin+ref.priceMax)/2)}`:'e.g. 150000'}/>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Promised Return Rate (%)
              {ref && <span style={{fontSize:'11px',color:'var(--color-danger)',marginLeft:'6px'}}>max {ref.maxReturn}% for {data.crop}</span>}
            </label>
            <input className="form-input text-mono" type="number" max={ref?.maxReturn} value={data.returnRate} onChange={e=>u('returnRate',e.target.value)} placeholder={`e.g. ${ref?.maxReturn||15}`}/>
            {ref && parseFloat(data.returnRate)>ref.maxReturn && (
              <p style={{fontSize:'12px',color:'var(--color-danger)',marginTop:'4px'}}>⚠ Exceeds the maximum allowed return for {data.crop} ({ref.maxReturn}%). AgriFlow only allows data-backed returns.</p>
            )}
          </div>
        </div>
      )}

      {step===4 && (
        <div className="fsec">
          <h3 className="fstitle">Review Details</h3>
          <div style={{border:'1px solid var(--color-border)',borderRadius:'12px',overflow:'hidden',marginBottom:'16px'}}>
            {[['Farm Name',data.name],['Crop',data.crop],['Location',`${data.state}, ${data.lga}`],['Size',`${data.size} ha`],['Budget',`₦${totalBudget.toLocaleString()}`],['Start',data.startDate],['Harvest',data.endDate],['Yield',`${data.expectedYield} ${ref?.unit||'tons'}`],['Return Rate',`${data.returnRate}%`]].map(([l,v])=>(
              <div key={l} style={{display:'flex',justifyContent:'space-between',padding:'11px 16px',borderBottom:'1px solid var(--color-border)',fontSize:'14px'}}><span style={{color:'var(--color-text-secondary)'}}>{l}</span><span style={{fontWeight:500}}>{v||'—'}</span></div>
            ))}
          </div>
          <div style={{padding:'14px 16px',background:'var(--color-primary-light)',borderRadius:'8px',fontSize:'13px',color:'var(--color-primary)',marginBottom:'16px'}}>Please confirm all text details are correct before proceeding to photo uploads and GPS anchoring.</div>
        </div>
      )}

      {step===5 && (
        <div className="fsec">
          <h3 className="fstitle">Location & Photos</h3>
          <p style={{fontSize:'14px', color:'var(--color-text-secondary)', marginBottom:'12px'}}>Final step: Anchor your farm with a live location photo and upload display pictures for investors.</p>
          
          <LiveLocationCapture 
            onLocationCapture={(loc, photo) => { u('location', loc); u('locationPhoto', photo); }}
            onClear={() => { u('location', null); u('locationPhoto', null); }}
          />

          <div className="form-group" style={{marginTop:'8px'}}>
            <label className="form-label">Display Photos (for Investors)</label>
            <div {...getRootProps()} className="dropzone"><input {...getInputProps()}/><span className="dropzone-inner">📎 Drag photos here or click to browse</span></div>
            {data.photos.length > 0 && (
              <div style={{display:'flex', gap:'8px', flexWrap:'wrap', marginTop:'12px'}}>
                {data.photos.map((file, i) => (
                  <div key={i} style={{position:'relative'}}>
                    <img src={file.preview} alt="" style={{width:'80px', height:'80px', objectFit:'cover', borderRadius:'8px', border:'1px solid var(--color-border)'}}/>
                    <button 
                      onClick={() => setData(p => ({...p, photos: p.photos.filter((_, idx) => idx !== i)}))}
                      style={{position:'absolute', top:'-6px', right:'-6px', background:'var(--color-danger)', color:'#fff', border:'none', borderRadius:'50%', width:'20px', height:'20px', fontSize:'12px', cursor:'pointer'}}
                    >✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{marginTop:'16px', padding:'16px', background:'rgba(16, 185, 129, 0.05)', border:'1px solid var(--color-primary)', borderRadius:'12px'}}>
             <p style={{fontSize:'13px', fontWeight:600, color:'var(--color-primary)', marginBottom:'4px'}}>Ready for Submission</p>
             <p style={{fontSize:'12px', color:'var(--color-text-secondary)', lineHeight:1.5}}>By submitting, you certify that the location photo was taken on-site. AgriFlow uses Smart Guard GPS validation to detect fraud.</p>
          </div>

          <button 
            className="btn btn-solid btn-full btn-lg" 
            disabled={!kycComplete || isSubmitting || !data.location || !data.locationPhoto} 
            onClick={handleSubmit}
            style={{marginTop:'12px'}}
          >
            {isSubmitting ? 'Submitting...' : 'Submit for Review'}
          </button>
        </div>
      )}

      <div style={{display:'flex',marginTop:'24px',paddingTop:'20px',borderTop:'1px solid var(--color-border)'}}>
        {step>1 && <button className="btn btn-ghost" onClick={()=>setStep(s=>s-1)} disabled={isSubmitting}>← Back</button>}
        {step<5 && <button className="btn btn-solid" style={{marginLeft:'auto'}} onClick={()=>setStep(s=>s+1)}>Continue →</button>}
      </div>

      <style>{`.farm-form{padding:28px}.form-steps{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:28px;align-items:center}.fstep{width:26px;height:26px;border-radius:50%;border:2px solid var(--color-border);display:inline-flex;align-items:center;justify-content:center;font-size:11px;font-weight:600;color:var(--color-text-secondary)}.fstep.act{border-color:var(--color-primary);background:var(--color-primary);color:#fff}.fstep.done{border-color:var(--color-primary);background:var(--color-primary-light);color:var(--color-primary)}.fsec{display:flex;flex-direction:column;gap:16px}.fstitle{font-size:18px;font-weight:600}.frow{display:grid;grid-template-columns:1fr 1fr;gap:12px}.dropzone{border:2px dashed var(--color-border);border-radius:12px;padding:28px 16px;text-align:center;cursor:pointer;transition:border-color .2s}.dropzone:hover{border-color:var(--color-primary)}.dropzone-inner{font-size:14px;color:var(--color-text-secondary)}@media(max-width:600px){.frow{grid-template-columns:1fr}}`}</style>
    </div>
  );
}

function ProofUpload({ milestone, onSuccess }) {
  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState(null);
  const [location, setLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { addToast } = useToast();

  const handleCapture = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPhoto(file);
    setPreview(URL.createObjectURL(file));
    setLocation(null);
    setLocationError(null);

    // Grab location at the moment of capture
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setLocation({
        latitude:  pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy:  pos.coords.accuracy
      }),
      () => setLocationError("Location access denied. Please enable location services and try again."),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  };

  const handleSubmit = async () => {
    if (!photo || !location) return;

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('photo', photo);
      formData.append('gps_latitude', location.latitude);
      formData.append('gps_longitude', location.longitude);
      formData.append('gps_accuracy_m', location.accuracy);
      if (note) formData.append('note', note);

      const res = await api.post(`/milestones/${milestone.id}/proof`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const data = res.data.data || res.data;
      const flag = data.gps_flag;

      if (flag === 'fail') {
        addToast("GPS Distance Failure", "error", "You appear to be too far from the farm. Please stand on the registered land.");
      } else if (flag === 'warning') {
        addToast("Location Warning", "warning", "You are 1km-5km from the farm. This proof will require manual admin review.");
        onSuccess(milestone.id);
      } else {
        addToast("Proof Submitted ✅", "success", "GPS Verified. Your milestone is now under review.");
        onSuccess(milestone.id);
      }
    } catch (err) {
      console.error(err);
      addToast(err.response?.data?.detail || "Submission failed", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ marginTop: '16px', padding: '16px', background: '#fdfbfa', border: '1px solid var(--color-border)', borderRadius: '8px' }}>
      {!preview ? (
        <label style={{ display: "block", cursor: "pointer", textAlign: "center", padding: "20px", borderRadius: "8px", background:'var(--color-primary-light)' }}>
          <input type="file" accept="image/*" capture="environment" onChange={handleCapture} style={{ display: "none" }} />
          <div className="btn btn-solid" style={{ marginBottom: "8px", pointerEvents:'none' }}>📷 Take Photo</div>
          <p style={{ fontSize: "12px", color: "var(--color-primary)", fontWeight:500 }}>Please take the photo at your farm with location services enabled.</p>
        </label>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <div style={{ display: "flex", gap: "12px", alignItems:'center' }}>
            <img src={preview} alt="Proof preview" style={{ width: "70px", height: "70px", objectFit: "cover", borderRadius: "8px", border:'1px solid var(--color-border)' }} />
            <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
              {location ? (
                <div style={{ padding: "6px 10px", background: "var(--color-primary-light)", borderRadius: "6px", fontSize: "12px", color: "var(--color-primary)", fontWeight: 500, display:'inline-block' }}>
                  ✓ Location captured ({location.accuracy.toFixed(0)}m accuracy)
                </div>
              ) : locationError ? (
                <div style={{ padding: "6px 10px", background: "rgba(181,74,47,0.1)", borderRadius: "6px", fontSize: "12px", color: "var(--color-danger)", display:'inline-block' }}>
                  ✗ {locationError}
                </div>
              ) : (
                <div style={{ padding: "6px 10px", background: "var(--color-surface)", borderRadius: "6px", fontSize: "12px", color: "var(--color-text-secondary)", display:'inline-block' }}>
                  ⏳ Acquiring GPS location...
                </div>
              )}
              <div style={{marginTop:'6px'}}><button onClick={() => { setPhoto(null); setPreview(null); setLocation(null); setLocationError(null); }} className="btn-link" style={{ fontSize: "12px" }}>Retake Photo</button></div>
            </div>
          </div>
          <textarea className="form-input" placeholder="Add a note (optional) — e.g. applied NPK fertiliser today" value={note} onChange={e => setNote(e.target.value)} rows={2} />
          <button className="btn btn-solid btn-full" disabled={!photo || !location || submitting} onClick={handleSubmit}>
            {submitting ? "Submitting..." : "Submit Proof & Location"}
          </button>
        </div>
      )}
    </div>
  );
}

function MilestonesTab() {
  const [farms, setFarms] = useState([]);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();

  const fetchFarms = async () => {
    try {
      const res = await api.get('/farms/my-farms');
      setFarms(res.data.data);
    } catch (err) {
      addToast("Failed to load milestones", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFarms();
  }, []);

  const handleSuccess = () => {
    fetchFarms(); // Refresh to show updated status
  };

  if (loading) return <div style={{padding:'40px', textAlign:'center'}}>Loading your milestones...</div>;

  const activeFarms = farms.filter(f => f.farm_status !== 'DRAFT');

  if (activeFarms.length === 0) {
    return (
      <div>
        <h1 style={{fontSize:'26px',fontWeight:700,marginBottom:'8px',fontFamily:'var(--font-heading)'}}>Milestones</h1>
        <div className="card" style={{padding:'40px',textAlign:'center'}}>
           <p style={{color:'var(--color-text-secondary)',marginBottom:'16px'}}>You don't have any active farms with milestones yet. Once your farm is approved, milestones will appear here.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 style={{fontSize:'26px',fontWeight:700,marginBottom:'8px',fontFamily:'var(--font-heading)'}}>Milestones</h1>
      <p style={{color:'var(--color-text-secondary)',marginBottom:'24px',fontSize:'14px'}}>Track and submit proof for your active farm milestones.</p>
      
      <div style={{display:'flex',flexDirection:'column',gap:'32px'}}>
        {activeFarms.map(farm => (
          <div key={farm.id}>
            <div style={{display:'flex', alignItems:'center', gap:'10px', marginBottom:'16px'}}>
              <div style={{width:'32px', height:'32px', borderRadius:'8px', background:'var(--color-primary)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:700, fontSize:'14px'}}>
                {farm.crop_name[0]}
              </div>
              <div>
                <h2 style={{fontSize:'18px', fontWeight:700}}>{farm.name}</h2>
                <p style={{fontSize:'12px', color:'var(--color-text-secondary)'}}>{farm.crop_name} · {farm.state}</p>
              </div>
            </div>

            <div style={{display:'flex',flexDirection:'column',gap:'14px'}}>
              {farm.milestones.map(m => (
                <div key={m.id} className="card" style={{padding:'20px'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'12px'}}>
                    <div>
                      <h3 style={{fontWeight:600}}>{m.name}</h3>
                      <p style={{fontSize:'13px',color:'var(--color-text-secondary)'}}>Expected Week: {m.expected_week}</p>
                    </div>
                    <span className={`badge badge-${m.status==='verified'?'active':m.status==='under_review'?'pending':'draft'}`}>
                      {m.status==='verified'?'Verified':m.status==='under_review'?'Under Review':m.status==='pending'?'Pending':'Active'}
                    </span>
                  </div>
                  
                  {m.status === 'rejected' && (
                    <div style={{marginBottom:'12px', padding:'12px 14px', background:'rgba(181,74,47,0.06)', borderLeft:'3px solid var(--color-danger)', borderRadius:'0 6px 6px 0', fontSize:'13px', lineHeight:1.6}}>
                      <strong style={{color:'var(--color-danger)', display:'block', marginBottom:'4px'}}>Admin note:</strong>
                      Please resubmit with a clearer image taken on-site at the correct farm location.
                    </div>
                  )}
                  
                  {/* Show camera proof uploader only if it's pending proof and not verified/under_review */}
                  {m.status !== 'verified' && m.status !== 'under_review' && (
                    <ProofUpload milestone={m} onSuccess={handleSuccess} />
                  )}
                  
                  {m.status === 'under_review' && (
                    <div style={{marginTop:'16px',padding:'16px',background:'var(--color-surface)',borderRadius:'8px',fontSize:'13px',color:'var(--color-text-secondary)',textAlign:'center'}}>
                      Proof submitted via device camera with live GPS coordinates. Awaiting admin review.
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function HarvestTab() {
  const { user } = useAuth();
  const [ay, setAy] = useState('');
  const [evidence, setEvidence] = useState(null);
  const [selectedFarm, setSelectedFarm] = useState('');
  const { addToast } = useToast();
  
  const farms = user?.isNewUser ? [] : mockFarmerFarms;
  const expected = 4.2;
  const v = ay ? (((parseFloat(ay)-expected)/expected)*100).toFixed(1) : null;
  const { getRootProps, getInputProps } = useDropzone({ maxFiles: 1, onDrop: files => setEvidence(files[0]) });

  if (user?.isNewUser) {
    return (
      <div>
        <h1 style={{fontSize:'26px',fontWeight:700,marginBottom:'24px',fontFamily:'var(--font-heading)'}}>Harvest Report</h1>
        <div className="card" style={{padding:'40px',textAlign:'center'}}>
           <p style={{color:'var(--color-text-secondary)',marginBottom:'16px'}}>You don't have any active farms ready for harvest yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 style={{fontSize:'26px',fontWeight:700,marginBottom:'24px',fontFamily:'var(--font-heading)'}}>Harvest Report</h1>
      <div className="card" style={{padding:'28px',maxWidth:'560px',display:'flex',flexDirection:'column',gap:'16px'}}>
        <div className="form-group"><label className="form-label">Select Farm</label>
          <select className="form-input form-select" value={selectedFarm} onChange={e=>setSelectedFarm(e.target.value)}>
             {farms.length === 0 ? <option value="">No farms available</option> : farms.map(f => <option key={f.id} value={f.id}>{f.name} - {f.crop}</option>)}
          </select>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:'12px'}}>
          <div className="form-group"><label className="form-label">Actual Yield ({farms.find(f => f.id === selectedFarm)?.crop === 'Poultry' ? 'birds' : 'tons'})</label><input className="form-input" type="number" value={ay} onChange={e=>setAy(e.target.value)} placeholder="e.g. 3.8"/></div>
          <div className="form-group"><label className="form-label">Unit</label><select className="form-input form-select"><option>tons</option><option>kg</option></select></div>
        </div>
        <div className="form-group"><label className="form-label">Total Sales (₦)</label><CurrencyInput className="form-input text-mono" placeholder="e.g. 950,000"/></div>
        <div className="form-group"><label className="form-label">Harvest Date</label><input className="form-input" type="date"/></div>
        <div className="form-group"><label className="form-label">Buyer (optional)</label><input className="form-input" placeholder="e.g. Dangote Foods"/></div>
        
        <div className="form-group">
          <label className="form-label">Payment Evidence <span style={{color:'var(--color-danger)'}}>*</span></label>
          <div {...getRootProps()} style={{border:'2px dashed var(--color-border)',padding:'20px',borderRadius:'8px',textAlign:'center',cursor:'pointer',background:evidence?'var(--color-primary-light)':'transparent',borderColor:evidence?'var(--color-primary)':'var(--color-border)'}}>
            <input {...getInputProps()}/>
            {evidence ? (
              <span style={{color:'var(--color-primary)',fontWeight:500}}>✓ {evidence.name} attached</span>
            ) : (
              <span style={{fontSize:'13px',color:'var(--color-text-secondary)'}}>📎 Upload bank alert or receipt photo</span>
            )}
          </div>
          <p style={{fontSize:'11px',color:'var(--color-text-secondary)',marginTop:'6px'}}>Required to verify harvest proceeds before investor payout.</p>
        </div>

        {v!==null && (
          <div style={{padding:'12px 16px',background:'var(--color-card-alt)',borderRadius:'8px',fontSize:'13px',display:'flex',gap:'24px',flexWrap:'wrap'}}>
            <span>Expected: <strong>{expected} tons</strong></span>
            <span>Reported: <strong>{ay} tons</strong></span>
            <span>Variance: <strong style={{color:parseFloat(v)>-10?'var(--color-accent)':'var(--color-danger)'}}>{v>0?'+':''}{v}%</strong></span>
          </div>
        )}
        <button className="btn btn-solid" disabled={!selectedFarm || !ay || !evidence} onClick={()=>addToast('Harvest report submitted!','success', 'Option A Verification step initiated.')}>Submit Report & Evidence</button>
      </div>
    </div>
  );
}

export default function FarmerDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab] = useState(searchParams.get('tab') || 'farms');
  
  useEffect(() => {
    const currentTab = searchParams.get('tab') || 'farms';
    if (tab !== currentTab) setTab(currentTab);
  }, [searchParams]);

  const [done, setDone] = useState(false);

  const handleTabChange = (k) => {
    setTab(k);
    setSearchParams({ tab: k });
    setDone(false);
  };

  const ITEMS_PER_PAGE = 5;
  const [farmsPage, setFarmsPage] = useState(1);
  const fbStart = (farmsPage - 1) * ITEMS_PER_PAGE;
  const { user, logout, fetchProfile } = useAuth();
  const [isKycOpen, setIsKycOpen] = useState(false);
  
  useEffect(() => {
    fetchProfile();
  }, []);

  const displayFarms = user?.isNewUser ? [] : mockFarmerFarms;
  const paginatedFarms = displayFarms.slice(fbStart, fbStart + ITEMS_PER_PAGE);
  const [payoutDetails, setPayoutDetails] = useState({ accountName: '', bankName: '', accountNumber: '' });
  const [detailsSaved, setDetailsSaved] = useState(false);
  const kycComplete = user?.bvn_verified && user?.bank_verified;
  const navigate = useNavigate();

  const navFooter = (
    <>
      <div style={{fontSize:'13px',color:'var(--color-text-secondary)',marginBottom:'8px'}}>{user?.name}</div>
      <button className="btn btn-ghost btn-sm btn-full" onClick={()=>{logout();navigate('/auth');}}>Log Out</button>
    </>
  );

  return (
    <>
    <DashboardLayout navItems={navItems} activeTab={tab} onTabChange={handleTabChange} footer={navFooter}>
        {!kycComplete && (
          <div className="kyc-banner" style={{
            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(245, 158, 11, 0.01) 100%)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            borderLeft: '4px solid #f59e0b',
            padding: '20px 24px',
            borderRadius: '12px',
            marginBottom: '28px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '20px',
            boxShadow: 'var(--shadow-sm)',
            backdropFilter: 'blur(8px)'
          }}>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
              <div style={{ 
                background: 'rgba(245, 158, 11, 0.15)', 
                color: '#f59e0b', 
                width: '40px', 
                height: '40px', 
                borderRadius: '10px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                fontSize: '20px',
                flexShrink: 0 
              }}>🔒</div>
              <div>
                <h4 style={{ color: 'var(--color-text-primary)', fontWeight: 600, fontSize: '15px', marginBottom: '6px' }}>
                  Complete your verification to start listing farms
                </h4>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                  <span style={{ 
                    color: user?.bvn_verified ? 'var(--color-primary)' : 'var(--color-text-secondary)', 
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    {user?.bvn_verified ? '✅ BVN Verified' : '⭕ Verify BVN'}
                  </span>
                  <span style={{ color: 'var(--color-text-muted)' }}>→</span>
                  <span style={{ 
                    color: user?.bank_verified ? 'var(--color-primary)' : 'var(--color-text-secondary)', 
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    {user?.bank_verified ? '✅ Bank Account Added' : 'Add Bank Account'}
                  </span>
                </div>
              </div>
            </div>
            <button className="btn btn-solid btn-sm" style={{ 
              background: '#f59e0b', 
              color: '#fff', 
              border: 'none',
              boxShadow: '0 4px 12px rgba(245, 158, 11, 0.25)',
              padding: '10px 16px',
              fontWeight: 600
            }} onClick={() => setIsKycOpen(true)}>
              Complete Setup
            </button>
          </div>
        )}
        {tab==='farms' && (
          <>
            {user?.bvn_verified && (
              <div className="card" style={{ padding: '20px 24px', marginBottom: '28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(135deg, var(--color-primary-light) 0%, #fff 100%)', border: '1px solid var(--color-primary)' }}>
                <div>
                  <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-primary)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Your Trust Score</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '32px', fontWeight: 800, color: 'var(--color-primary)' }}>{user?.trust_score || 0}</span>
                    <span style={{ fontSize: '18px', color: 'var(--color-text-secondary)', fontWeight: 500 }}>/ 100</span>
                    <span className="badge badge-active" style={{ marginLeft: '12px', background: 'var(--color-primary)', color: '#fff' }}>⭐ {user?.trust_tier || 'Emerging Farmer'}</span>
                  </div>
                </div>
                <div style={{ textAlign: 'right', fontSize: '13px', color: 'var(--color-text-secondary)', maxWidth: '240px' }}>
                  {user?.bank_verified 
                    ? "🎉 You have full access! Keep completing milestones to grow your score."
                    : "Add your bank account to reach 'Verified Farmer' status."}
                </div>
              </div>
            )}

            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'28px'}}>
              <h1 style={{fontSize:'26px',fontWeight:700,fontFamily:'var(--font-heading)'}}>My Farms</h1>
              <button className="btn btn-solid btn-sm" onClick={() => kycComplete ? handleTabChange('add') : setIsKycOpen(true)}>+ Add Farm</button>
            </div>

            {/* Deadline-passed decision banner */}
            {displayFarms.some(f => f.status === 'deadline_passed') && displayFarms.filter(f => f.status === 'deadline_passed').map(farm => (
              <div key={`dp-${farm.id}`} style={{background:'rgba(180,120,0,0.07)',border:'2px solid var(--color-accent)',borderRadius:'12px',padding:'20px 24px',marginBottom:'20px'}}>
                <div style={{display:'flex',gap:'12px',alignItems:'flex-start',marginBottom:'14px'}}>
                  <span style={{fontSize:'22px',flexShrink:0}}>⚠️</span>
                  <div>
                    <p style={{fontWeight:700,fontSize:'15px',marginBottom:'4px'}}>Your farm "{farm.name}" did not reach its funding goal of ₦{(farm.goal||0).toLocaleString()}</p>
                    <p style={{fontSize:'13px',color:'var(--color-text-secondary)',lineHeight:1.5}}>You raised ₦{(farm.raised||0).toLocaleString()} ({farm.goal ? Math.round((farm.raised/farm.goal)*100) : 0}%). You have <strong>47 hours</strong> to decide:</p>
                  </div>
                </div>
                <div style={{display:'flex',gap:'12px',flexWrap:'wrap',marginBottom:'10px'}}>
                  <button className="btn btn-solid btn-sm" style={{background:'var(--color-primary)'}} onClick={() => addToast('Deadline extended!','success','Investors have been notified of the new window.')}>Extend Deadline</button>
                  <button className="btn btn-ghost btn-sm" style={{color:'var(--color-danger)',borderColor:'var(--color-danger)'}} onClick={() => addToast('Farm cancelled.','error','All investors will be refunded automatically.')}>Cancel &amp; Refund Investors</button>
                </div>
                <p style={{fontSize:'12px',color:'var(--color-text-secondary)'}}>If you do not respond, investors will be automatically refunded after the 48-hour window closes.</p>
              </div>
            ))}

            {displayFarms.length===0 ? <EmptyState title="No farms yet" description="Create your first farm listing." action={()=>handleTabChange('add')} actionLabel="Add Farm"/> : (
              <div style={{display:'flex',flexDirection:'column',gap:'14px'}}>
                {paginatedFarms.map(farm=>{
                  const pct=farm.raised?Math.round((farm.raised/farm.goal)*100):0;
                  const statusBadge = farm.status==='active'?'active':farm.status==='funded'?'pending':farm.status==='deadline_passed'?'pending':['cancelled','rejected'].includes(farm.status)?'danger':'draft';
                  const statusLabel = farm.status==='deadline_passed'?'Deadline Passed':farm.status.charAt(0).toUpperCase()+farm.status.slice(1);
                  return (
                    <div key={farm.id} className="card" style={{padding:'20px 24px',opacity:['cancelled','rejected'].includes(farm.status)?0.7:1}}>
                      <div style={{display:'flex',alignItems:'center',gap:'16px',flexWrap:'wrap'}}>
                        <div style={{flex:1,minWidth:'160px'}}><h3 style={{fontWeight:600,fontSize:'16px'}}>{farm.name}</h3><p style={{fontSize:'13px',color:'var(--color-text-secondary)'}}>{farm.crop}</p></div>
                        <span className={`badge badge-${statusBadge}`} style={{textTransform:'capitalize'}}>{statusLabel}</span>
                        {farm.raised>0 && <div style={{display:'flex',alignItems:'center',gap:'10px',minWidth:'180px'}}><div className="progress-track" style={{flex:1}}><div className="progress-fill" style={{width:`${pct}%`}}/></div><span className="text-mono" style={{fontSize:'13px',fontWeight:600}}>{pct}%</span></div>}
                        <div style={{display:'flex',gap:'8px'}}>
                          <Link to={`/farms/${farm.id}`} className="btn btn-ghost btn-sm">Manage</Link>
                          {!['deadline_passed','cancelled','rejected'].includes(farm.status) && (
                            <button className="btn btn-solid btn-sm" onClick={()=>handleTabChange('milestones')}>Upload Proof</button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
                <Pagination currentPage={farmsPage} totalPages={Math.ceil(displayFarms.length / ITEMS_PER_PAGE)} onPageChange={setFarmsPage} />
              </div>
            )}
          </>
        )}

        {tab==='add' && (
          <div>
            <h1 style={{fontSize:'26px',fontWeight:700,marginBottom:'24px',fontFamily:'var(--font-heading)'}}>Add a Farm</h1>
            {!kycComplete ? (
              <div className="card" style={{padding:'40px',textAlign:'center'}}>
                <span style={{fontSize:'40px',display:'block',marginBottom:'16px'}}>🔒</span>
                <h3 style={{fontWeight:600,fontSize:'18px',marginBottom:'8px'}}>Verification Required</h3>
                <p style={{color:'var(--color-text-secondary)',marginBottom:'24px',maxWidth:'400px',margin:'0 auto 24px'}}>You must complete your BVN and Bank Account verification in Settings before creating a farm.</p>
                <button className="btn btn-solid" onClick={() => handleTabChange('settings')}>Go to Settings</button>
              </div>
            ) : done ? (
              <div className="card" style={{padding:'48px',textAlign:'center'}}><div style={{fontSize:'48px',marginBottom:'16px'}}>✅</div><h2 style={{fontWeight:600,marginBottom:'8px'}}>Submitted for Review</h2><p style={{color:'var(--color-text-secondary)'}}>Our team will review within 24 hours.</p><button className="btn btn-solid" style={{marginTop:'20px'}} onClick={()=>{setDone(false);handleTabChange('farms');}}>Back to My Farms</button></div>
            ) : <FarmCreationForm onDone={()=>setDone(true)}/>}
          </div>
        )}

        {tab==='milestones' && <MilestonesTab/>}
        {tab==='harvest' && <HarvestTab/>}

        {tab==='explore' && (
          <div>
            <div style={{background:'var(--color-card-alt)',border:'1px solid var(--color-border)',borderRadius:'12px',padding:'14px 18px',marginBottom:'20px',display:'flex',justifyContent:'space-between',alignItems:'center',gap:'16px',flexWrap:'wrap'}}>
              <span style={{fontSize:'14px',color:'var(--color-text-secondary)'}}>Seeing how other farmers present their projects? Use what you learn when creating your own.</span>
              <button className="btn btn-ghost btn-sm" onClick={()=>setTab('add')}>Create a farm →</button>
            </div>
            <div className="card" style={{padding:'40px',textAlign:'center',color:'var(--color-text-secondary)'}}>
              <p style={{marginBottom:'16px'}}>Browse active farms on the platform.</p>
              <Link to="/farms" className="btn btn-solid">Open Farm Marketplace →</Link>
            </div>
          </div>
        )}

        {tab==='settings' && (
          <div>
            <h1 style={{fontSize:'26px',fontWeight:700,marginBottom:'24px',fontFamily:'var(--font-heading)'}}>Settings</h1>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', alignItems: 'flex-start' }}>
              <div className="card" style={{padding:'24px',flex: '1 1 300px',maxWidth:'480px',display:'flex',flexDirection:'column',gap:'16px'}}>
                <h3 style={{ fontWeight: 600, marginBottom: '8px' }}>Account Information</h3>
                <div className="form-group"><label className="form-label">Full Name</label><input className="form-input" defaultValue={user?.name}/></div>
                <div className="form-group"><label className="form-label">Email</label><input className="form-input" defaultValue={user?.email}/></div>
                <div className="form-group"><label className="form-label">Short Bio</label><textarea className="form-input form-textarea" rows={3} placeholder="Tell investors about your farming experience…"/></div>
                <button className="btn btn-solid">Save Changes</button>
              </div>

              {/* Payout Details */}
              <div className="card" style={{ padding: '24px', flex: '1 1 320px', maxWidth: '600px' }}>
                <h3 style={{ fontWeight: 600, marginBottom: '12px' }}>Payout Details</h3>
                <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '20px', lineHeight: 1.5 }}>Where should we send your proceeds when your harvest is sold? Account name must match your BVN.</p>
                
                {detailsSaved ? (
                  <div style={{ padding: '16px', backgroundColor: 'var(--color-primary-light)', color: 'var(--color-primary-dark)', borderRadius: '8px', marginBottom: '20px', fontSize: '14px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '18px' }}>✓</span> Your details are saved. You'll receive payouts here.
                  </div>
                ) : null}
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}><label className="form-label">Account Name (Must match BVN)</label><input className="form-input" value={payoutDetails.accountName} onChange={e => setPayoutDetails({...payoutDetails, accountName: e.target.value})} placeholder="e.g. Adewale Farming Co." /></div>
                  <div className="form-group"><label className="form-label">Bank Name</label>
                    <select className="form-select form-input" value={payoutDetails.bankName} onChange={e => setPayoutDetails({...payoutDetails, bankName: e.target.value})}>
                      <option value="">Select Bank...</option>
                      <option value="GTBank">GTBank</option>
                      <option value="First Bank">First Bank</option>
                      <option value="Zenith Bank">Zenith Bank</option>
                      <option value="Access Bank">Access Bank</option>
                    </select>
                  </div>
                  <div className="form-group"><label className="form-label">Account Number</label><input className="form-input text-mono" maxLength={10} value={payoutDetails.accountNumber} onChange={e => setPayoutDetails({...payoutDetails, accountNumber: e.target.value})} placeholder="0123456789" /></div>
                </div>
                
                <button className="btn btn-solid" style={{ width: '100%', marginTop: '16px' }} onClick={() => setDetailsSaved(true)} disabled={detailsSaved || !payoutDetails.accountName || !payoutDetails.accountNumber}>Save Payout Details</button>
              </div>
            </div>
          </div>
        )}
    </DashboardLayout>
    <KYCModal isOpen={isKycOpen} onClose={() => setIsKycOpen(false)} role="farmer" />
    </>
  );
}
