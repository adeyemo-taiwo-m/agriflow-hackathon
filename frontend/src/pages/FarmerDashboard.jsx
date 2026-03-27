import { useState, useEffect, useCallback, useRef } from 'react';
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
import Loader, { Spinner } from '../components/Loader';
import Button from '../components/Button';
import Icon from '../components/Icon';
import { formatCurrency } from '../utils/format';

const FILE_LIMITS_MB = {
  DISPLAY_PHOTO: 8,
  LOCATION_PHOTO: 5,
  MILESTONE_PHOTO: 5,
  PAYMENT_PHOTO: 5,
};

const mbToBytes = (mb) => mb * 1024 * 1024;

const isImageFile = (file) => Boolean(file?.type?.startsWith('image/'));

const loadImageFromFile = (file) => new Promise((resolve, reject) => {
  const objectUrl = URL.createObjectURL(file);
  const img = new Image();

  img.onload = () => {
    URL.revokeObjectURL(objectUrl);
    resolve(img);
  };

  img.onerror = () => {
    URL.revokeObjectURL(objectUrl);
    reject(new Error('Unable to load image'));
  };

  img.src = objectUrl;
});

const canvasToBlob = (canvas, quality) => new Promise((resolve, reject) => {
  canvas.toBlob(
    (blob) => {
      if (!blob) {
        reject(new Error('Image compression failed'));
        return;
      }
      resolve(blob);
    },
    'image/jpeg',
    quality
  );
});

async function compressImageIfNeeded(file, maxSizeMB) {
  const maxSizeBytes = mbToBytes(maxSizeMB);

  if (!isImageFile(file) || file.size <= maxSizeBytes) {
    return file;
  }

  const image = await loadImageFromFile(file);
  let width = image.width;
  let height = image.height;
  const maxDimension = 1920;

  if (Math.max(width, height) > maxDimension) {
    const scale = maxDimension / Math.max(width, height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return file;
  }

  canvas.width = width;
  canvas.height = height;
  ctx.drawImage(image, 0, 0, width, height);

  let quality = 0.85;
  let blob = await canvasToBlob(canvas, quality);

  while (blob.size > maxSizeBytes && quality > 0.45) {
    quality -= 0.1;
    blob = await canvasToBlob(canvas, quality);
  }

  if (blob.size > maxSizeBytes) {
    // Last attempt with reduced dimensions.
    canvas.width = Math.round(width * 0.85);
    canvas.height = Math.round(height * 0.85);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    blob = await canvasToBlob(canvas, Math.max(quality, 0.5));
  }

  if (blob.size > maxSizeBytes) {
    return file;
  }

  const originalName = file.name.replace(/\.[^.]+$/, '');
  return new File([blob], `${originalName}.jpg`, { type: 'image/jpeg' });
}

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
  const { addToast } = useToast();

  const handleCapture = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    let processedFile = file;
    try {
      processedFile = await compressImageIfNeeded(file, FILE_LIMITS_MB.LOCATION_PHOTO);
    } catch {
      addToast('Could not optimize location photo. Please try another image.', 'error');
      return;
    }

    if (processedFile.size > mbToBytes(FILE_LIMITS_MB.LOCATION_PHOTO)) {
      addToast(
        `Location photo is still too large after optimization. Please use a smaller image (max ${FILE_LIMITS_MB.LOCATION_PHOTO}MB).`,
        'error'
      );
      return;
    }

    setPhoto(processedFile);
    setPreview(URL.createObjectURL(processedFile));
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
        onLocationCapture(loc, processedFile);
      },
      () => setLocationError("Location access denied. Please enable location services."),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  };

  return (
    <div style={{ padding: '16px', background: 'var(--color-primary-light)', border: '1px solid var(--color-primary)', borderRadius: '8px', marginBottom: '16px' }}>
      <h4 style={{fontSize:'14px',fontWeight:600,color:'var(--color-primary)',marginBottom:'8px'}}>Live Farm Location Verification</h4>
      <p style={{fontSize:'12px',color:'var(--color-text-secondary)',marginBottom:'12px',lineHeight:1.4}}>Take a live picture at the farm to verify its GPS coordinates. This anchors your farm on AgriFlow. (Will not be shown to investors)</p>
      <p style={{fontSize:'12px',color:'var(--color-text-secondary)',marginBottom:'12px'}}>Maximum location photo size: {FILE_LIMITS_MB.LOCATION_PHOTO}MB</p>
      
      {!preview ? (
        <label style={{ display: "block", cursor: "pointer", textAlign: "center", padding: "12px", borderRadius: "8px", background:'#fff', border:'1px solid var(--color-primary)' }}>
          <input type="file" accept="image/*" capture="environment" onChange={handleCapture} style={{ display: "none" }} />
          <div className="btn btn-solid btn-sm" style={{ pointerEvents:'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <Icon name="camera" size={16} /> Capture Location & Photo
          </div>
        </label>
      ) : (
        <div style={{ display: "flex", gap: "12px", alignItems:'center', background:'#fff', padding:'10px', borderRadius:'8px' }}>
          <img src={preview} alt="Location proof" style={{ width: "50px", height: "50px", objectFit: "cover", borderRadius: "4px", border:'1px solid var(--color-border)' }} />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
            {location ? (
              <div style={{ fontSize: "12px", color: "var(--color-primary)", fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Icon name="milestones" size={14} /> Location captured ({location.accuracy.toFixed(0)}m accuracy)
              </div>
            ) : locationError ? (
              <div style={{ fontSize: "12px", color: "var(--color-danger)", display: 'flex', alignItems: 'center', gap: '4px' }}>
                ✕ {locationError}
              </div>
            ) : (
              <div style={{ fontSize: "12px", color: "var(--color-text-secondary)", display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Icon name="clock" size={14} /> Acquiring GPS location...
              </div>
            )}
            <div style={{marginTop:'4px'}}><button onClick={() => { setPhoto(null); setPreview(null); setLocation(null); setLocationError(null); onClear(); }} className="btn-link" style={{ fontSize: "12px", padding:0 }}>Retake</button></div>
          </div>
        </div>
      )}
    </div>
  );
}

function FarmCreationForm({ onDone, continueFarm = null }) {
  const [step, setStep] = useState(1);
  const [data, setData] = useState({ name:'', crop:'', state:'', lga:'', size:'', description:'', photos:[], stages:[], totalBudget:'', startDate:'', endDate:'', expectedYield:'', salePrice:'', returnRate:'', location:null, locationPhoto:null });
  const [crops, setCrops] = useState([]);
  const [loadingCrops, setLoadingCrops] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { addToast } = useToast();
  const { user } = useAuth();
  const initializedDraftIdRef = useRef(null);
  const kycComplete = user?.bvn_verified && user?.bank_verified;
  const steps = ['Details','Budget','Timeline','Review', 'Upload'];
  const u = (k,v) => setData(p=>({...p,[k]:v}));
  const us = (i,k,v) => { const s=[...data.stages]; s[i]={...s[i],[k]:v}; setData(p=>({...p,stages:s})); };
  const {getRootProps,getInputProps} = useDropzone({
    accept:{'image/*':[]},
    onDrop: async (files) => {
      if (!files?.length) return;

      const processed = await Promise.all(
        files.map(async (file) => {
          try {
            const compressed = await compressImageIfNeeded(file, FILE_LIMITS_MB.DISPLAY_PHOTO);
            if (compressed.size > mbToBytes(FILE_LIMITS_MB.DISPLAY_PHOTO)) {
              return null;
            }
            return Object.assign(compressed, { preview: URL.createObjectURL(compressed) });
          } catch {
            return null;
          }
        })
      );

      const acceptedPhotos = processed.filter(Boolean);
      const rejectedCount = files.length - acceptedPhotos.length;

      if (acceptedPhotos.length) {
        setData((prev) => ({ ...prev, photos: [...prev.photos, ...acceptedPhotos] }));
      }

      if (rejectedCount > 0) {
        addToast(
          `${rejectedCount} photo(s) could not be optimized under ${FILE_LIMITS_MB.DISPLAY_PHOTO}MB. Please use smaller images.`,
          'error'
        );
      }
    },
    onDropRejected: (rejections) => {
      addToast('Some files were rejected. Please upload only valid image files.', 'error');
    },
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

  useEffect(() => {
    if (!continueFarm) {
      initializedDraftIdRef.current = null;
      return;
    }

    if (initializedDraftIdRef.current === continueFarm.id) {
      return;
    }

    setData((prev) => ({
      ...prev,
      name: continueFarm.name || '',
      crop: continueFarm.crop_name || '',
      state: continueFarm.state || '',
      lga: continueFarm.lga || '',
      size: continueFarm.farm_size_ha ? String(continueFarm.farm_size_ha) : '',
      description: continueFarm.description || '',
      totalBudget: continueFarm.total_budget ? String(continueFarm.total_budget) : '',
      startDate: continueFarm.start_date || '',
      endDate: continueFarm.harvest_date || '',
      expectedYield: continueFarm.expected_yield ? String(continueFarm.expected_yield) : '',
      salePrice: continueFarm.sale_price_per_unit ? String(continueFarm.sale_price_per_unit) : '',
      returnRate: continueFarm.return_rate ? String(continueFarm.return_rate * 100) : '',
      photos: [],
      location: null,
      locationPhoto: null,
    }));
    setStep(5);
    initializedDraftIdRef.current = continueFarm.id;
  }, [continueFarm]);

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
    const totalBudget = parseFloat(data.totalBudget);
    const expectedYield = parseFloat(data.expectedYield);
    const salePricePerUnit = parseFloat(data.salePrice);
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

    if (data.locationPhoto && data.locationPhoto.size > mbToBytes(FILE_LIMITS_MB.LOCATION_PHOTO)) {
      return addToast(`Location photo must be ${FILE_LIMITS_MB.LOCATION_PHOTO}MB or less`, "error");
    }

    const oversizedDisplayPhoto = data.photos.find(
      (photo) => photo.size > mbToBytes(FILE_LIMITS_MB.DISPLAY_PHOTO)
    );
    if (oversizedDisplayPhoto) {
      return addToast(`Each display photo must be ${FILE_LIMITS_MB.DISPLAY_PHOTO}MB or less`, "error");
    }

    const isContinuation = continueFarm && continueFarm.farm_status === 'draft';

    setIsSubmitting(true);
    try {
      let farmId = continueFarm?.id;

      if (!isContinuation) {
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
        farmId = createRes.data.data.id;
      }

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

      addToast(
        isContinuation ? 'Farm registration completed!' : 'Farm submitted for review!',
        'success',
        isContinuation
          ? 'Draft farm is now fully submitted for admin review.'
          : 'All details and photos uploaded successfully.'
      );
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

  if (loadingCrops) return <Loader message="Loading crop data..." />;

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
                <p style={{fontSize:'12px',color:'var(--color-danger)',marginTop:'4px', display:'flex', alignItems: 'center', gap: '4px'}}><Icon name="alert" size={12} /> {data.crop} is not commonly grown in {data.state}</p>
              )}
            </div>
          </div>
          <div className="frow">
            <div className="form-group"><label className="form-label">LGA</label><input className="form-input" value={data.lga} onChange={e=>u('lga',e.target.value)} placeholder="Local Government Area"/></div>
            <div className="form-group"><label className="form-label">Farm Size (ha)</label><input className="form-input" type="number" value={data.size} onChange={e=>u('size',e.target.value)} placeholder="e.g. 2"/></div>
          </div>

          {ref && sz>0 && (
            <div style={{background:'var(--color-primary-light)',border:'1px solid var(--color-primary)',borderRadius:'12px',padding:'16px 20px'}}>
              <p style={{fontWeight:700,fontSize:'13px',color:'var(--color-primary)',marginBottom:'10px',display:'flex',alignItems:'center',gap:'6px'}}>
                <Icon name="sprout" size={24} /> AgriFlow suggests for {data.crop} · {sz} ha
              </p>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'6px 20px',fontSize:'13px'}}>
                {[['Budget range',`${formatCurrency(ref.costMin*sz)} – ${formatCurrency(ref.costMax*sz)}`],
                  ['Expected yield',`${ref.yieldMin*sz} – ${ref.yieldMax*sz} ${ref.unit}`],
                  ['Revenue estimate',`${formatCurrency(revMin)} – ${formatCurrency(revMax)}`],
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
              Reference budget: <strong>{formatCurrency(ref.costMin*sz)} – {formatCurrency(ref.costMax*sz)}</strong> for {sz}ha of {data.crop}
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
            {budgetWarn && <p style={{fontSize:'12px',color:'var(--color-danger)',marginTop:'4px', display:'flex', alignItems: 'center', gap: '4px'}}><Icon name="alert" size={12} /> Exceeds reference max by &gt;20% for this crop and farm size</p>}
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
              {stageMismatch && <div style={{padding:'10px 14px',background:'var(--color-accent-light)',borderRadius:'8px',fontSize:'13px',color:'var(--color-accent)', display:'flex', alignItems: 'center', gap: '6px'}}><Icon name="alert" size={12} /> Stage totals (₦{stageTotal.toLocaleString()}) don't match budget (₦{totalBudget.toLocaleString()})</div>}
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
                <p style={{fontSize:'12px',color:'var(--color-danger)',marginTop:'4px', display:'flex', alignItems: 'center', gap: '4px'}}><Icon name="alert" size={12} /> Exceeds reference max yield for this farm size</p>
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
              <p style={{fontSize:'12px',color:'var(--color-danger)',marginTop:'4px', display:'flex', alignItems: 'center', gap: '4px'}}><Icon name="alert" size={12} /> Exceeds the maximum allowed return for {data.crop} ({ref.maxReturn}%). AgriFlow only allows data-backed returns.</p>
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
          {continueFarm && (
            <div style={{padding:'12px 14px',background:'var(--color-primary-light)',borderRadius:'8px',fontSize:'13px',color:'var(--color-primary)',marginBottom:'4px'}}>
              Continuing registration for <strong>{continueFarm.name}</strong>. Complete this upload step to submit the farm for review.
            </div>
          )}
          <p style={{fontSize:'14px', color:'var(--color-text-secondary)', marginBottom:'12px'}}>Final step: Anchor your farm with a live location photo and upload display pictures for investors.</p>
          
          <LiveLocationCapture 
            onLocationCapture={(loc, photo) => { u('location', loc); u('locationPhoto', photo); }}
            onClear={() => { u('location', null); u('locationPhoto', null); }}
          />

          <div className="form-group" style={{marginTop:'8px'}}>
            <label className="form-label">Display Photos (for Investors)</label>
            <p style={{fontSize:'12px',color:'var(--color-text-secondary)',marginTop:'-2px',marginBottom:'8px'}}>Maximum display photo size: {FILE_LIMITS_MB.DISPLAY_PHOTO}MB each</p>
            <div {...getRootProps()} className="dropzone"><input {...getInputProps()}/><span className="dropzone-inner" style={{display:'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'}}><Icon name="add" size={16} /> Drag photos here or click to browse</span></div>
            {data.photos.length > 0 && (
              <div style={{display:'flex', gap:'8px', flexWrap:'wrap', marginTop:'12px'}}>
                {data.photos.map((file, i) => (
                  <div key={i} style={{position:'relative'}}>
                    <img src={file.preview} alt="" style={{width:'80px', height:'80px', objectFit:'cover', borderRadius:'8px', border:'1px solid var(--color-border)'}}/>
                    <span style={{position:'absolute',bottom:'4px',left:'4px',background:'rgba(0,0,0,0.72)',color:'#fff',padding:'1px 6px',borderRadius:'10px',fontSize:'10px'}}>
                      {(file.size / (1024 * 1024)).toFixed(2)}MB
                    </span>
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

          <Button 
            variant="solid" 
            size="lg"
            className="btn-full" 
            disabled={!kycComplete || isSubmitting || !data.location || !data.locationPhoto} 
            onClick={handleSubmit}
            loading={isSubmitting}
            style={{marginTop:'12px'}}
          >
            Submit for Review
          </Button>
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
  const [submitted, setSubmitted] = useState(false);
  const { addToast } = useToast();

  const handleCapture = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    let processedFile = file;
    try {
      processedFile = await compressImageIfNeeded(file, FILE_LIMITS_MB.MILESTONE_PHOTO);
    } catch {
      addToast('Could not optimize proof photo. Please try another image.', 'error');
      return;
    }

    if (processedFile.size > mbToBytes(FILE_LIMITS_MB.MILESTONE_PHOTO)) {
      addToast(
        `Proof photo is still too large after optimization. Please use a smaller image (max ${FILE_LIMITS_MB.MILESTONE_PHOTO}MB).`,
        'error'
      );
      return;
    }

    setPhoto(processedFile);
    setPreview(URL.createObjectURL(processedFile));
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

      addToast('Proof submitted!', 'success', 'Photo and location logged. Admin will review shortly.');
      setSubmitted(true); // Set submitted state on success
      // Delay parent callback to allow user to see success state
      setTimeout(() => {
        onSuccess();
      }, 2000);
    } catch (err) {
      addToast('Upload failed', 'error', err.response?.data?.detail || 'Could not upload proof'); // Modified error message
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div style={{ padding: '24px', backgroundColor: '#eefcf5', border: '1px solid #d0f0e0', borderRadius: '12px', color: '#1a5d3b', textAlign: 'center' }}>
        <div style={{ fontSize: '24px', marginBottom: '8px' }}>✓</div>
        <div style={{ fontWeight: 600 }}>Proof Submitted Successfully</div>
        <div style={{ fontSize: '13px', opacity: 0.8, marginTop: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          <Spinner size="sm" /> Refreshing dashboard...
        </div>
      </div>
    );
  }

  return (
    <div style={{ marginTop: '16px', padding: '24px', background: '#f9fbf9', border: '1px solid #e8f0e8', borderRadius: '12px' }}>
      {!preview ? (
        <div style={{ textAlign: "center" }}>
          <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '10px' }}>
            Maximum proof photo size: {FILE_LIMITS_MB.MILESTONE_PHOTO}MB
          </p>
          <label style={{ display: "inline-block", cursor: "pointer", textAlign: "center" }}>
            <input type="file" accept="image/*" capture="environment" onChange={handleCapture} style={{ display: "none" }} />
            <div className="btn" style={{ 
              background: '#1a5d3b', 
              color: '#fff', 
              padding: '10px 24px', 
              borderRadius: '8px', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
              fontSize: '15px',
              fontWeight: 600
            }}>
              <Icon name="camera" size={16} /> Take Photo
            </div>
          </label>
          <p style={{ fontSize: "13px", color: "var(--color-primary)", marginTop: '12px', fontWeight: 500 }}>
            Please take the photo at your farm with location services enabled.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <div style={{ display: "flex", gap: "12px", alignItems:'center' }}>
            <img src={preview} alt="Proof preview" style={{ width: "80px", height: "80px", objectFit: "cover", borderRadius: "8px", border:'1px solid var(--color-border)' }} />
            <div style={{ flex: 1 }}>
              {location ? (
                <div style={{ fontSize: "13px", color: "var(--color-primary)", fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Icon name="milestones" size={14} /> Location captured ({location.accuracy.toFixed(0)}m accuracy)
                </div>
              ) : locationError ? (
                <div style={{ fontSize: "13px", color: "var(--color-danger)", display: 'flex', alignItems: 'center', gap: '4px' }}>
                  ✕ {locationError}
                </div>
              ) : (
                <div style={{ fontSize: "13px", color: "var(--color-text-secondary)", display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Icon name="clock" size={14} /> Acquiring GPS location...
                </div>
              )}
              <button onClick={() => { setPhoto(null); setPreview(null); setLocation(null); setLocationError(null); }} className="btn-link" style={{ fontSize: "12px", padding: 0, marginTop: '4px' }}>Retake Photo</button>
            </div>
          </div>
          <textarea className="form-input" placeholder="Add a note (optional)..." value={note} onChange={e => setNote(e.target.value)} rows={2} />
          <Button variant="solid" className="btn-full" disabled={!photo || !location || submitting} onClick={handleSubmit} loading={submitting}>
            Submit Proof & Location
          </Button>
        </div>
      )}
    </div>
  );
}

function MilestonesTab() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [farms, setFarms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFarmId, setSelectedFarmId] = useState(searchParams.get('farmId'));
  const [milestones, setMilestones] = useState([]);
  const [fetchingMilestones, setFetchingMilestones] = useState(false);
  const { addToast } = useToast();
  const { user } = useAuth();

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

  const loadMilestones = useCallback(async () => {
    if (!selectedFarmId) return;
    setFetchingMilestones(true);
    try {
      const res = await api.get(`/farms/${selectedFarmId}`);
      setMilestones(res.data.data.milestones || []);
    } catch (err) {
      addToast("Failed to load farm milestones", "error");
    } finally {
      setFetchingMilestones(false);
    }
  }, [selectedFarmId, addToast]);

  useEffect(() => {
    loadMilestones();
    
    // Auto-refresh every 30 seconds while the tab is open (and focused)
    const interval = setInterval(() => {
      // SILENT REFRESH: Only poll if the tab is visible and we ARE NOT currently uploading a proof
      // We check for any active upload state in the document if possible, or just the tab focus.
      if (document.visibilityState === 'visible') {
        api.get(`/farms/${selectedFarmId}`).then(res => {
          setMilestones(res.data.data.milestones || []);
        }).catch(() => {}); // Fail silently in background
      }
    }, 30000);
    
    return () => clearInterval(interval);
  }, [loadMilestones]);

  const handleSuccess = async () => {
    await loadMilestones();
    // Use a small delay before potentially clearing view or just rely on state update
  };

  if (loading) return <Loader message="Loading your milestones..." />;
  
  // Only show farms that are approved (status === 'active')
  const activeFarms = farms.filter(f => f.farm_status === 'active');

  if (activeFarms.length === 0) {
    return (
      <div>
        <h1 style={{fontSize:'26px',fontWeight:700,marginBottom:'8px',fontFamily:'var(--font-heading)'}}>Milestones</h1>
        <div className="card" style={{padding:'40px',textAlign:'center'}}>
           <p style={{color:'var(--color-text-secondary)',marginBottom:'16px'}}>You don't have any approved farms with milestones yet. Once your farm is approved, milestones will appear here.</p>
        </div>
      </div>
    );
  }

  // Find the selected farm
  const selectedFarm = selectedFarmId ? activeFarms.find(f => f.id === selectedFarmId) : null;

  if (!selectedFarmId || !selectedFarm) {
    return (
      <div>
        <h1 style={{fontSize:'26px',fontWeight:700,marginBottom:'8px',fontFamily:'var(--font-heading)'}}>Milestones</h1>
        <p style={{color:'var(--color-text-secondary)',marginBottom:'24px',fontSize:'14px'}}>Select a farm to view and manage its milestones.</p>
        
        <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
          {activeFarms.map(farm => (
            <div 
              key={farm.id} 
              className="card farm-selection-card" 
              onClick={() => {
                setSelectedFarmId(farm.id);
                setSearchParams({ tab: 'milestones', farmId: farm.id });
              }}
              style={{
                padding:'16px 20px', 
                cursor:'pointer', 
                display:'flex', 
                alignItems:'center', 
                justifyContent:'space-between',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{display:'flex', alignItems:'center', gap:'16px'}}>
                <div style={{
                  width:'40px', 
                  height:'40px', 
                  borderRadius:'10px', 
                  background:'var(--color-primary-light)', 
                  display:'flex', 
                  alignItems:'center', 
                  justifyContent:'center', 
                  color:'var(--color-primary)', 
                  fontWeight:700, 
                  fontSize:'16px'
                }}>
                  {(farm.crop_name || 'F')[0]}
                </div>
                <div>
                  <h3 style={{fontSize:'16px', fontWeight:600}}>{farm.name}</h3>
                  <p style={{fontSize:'12px', color:'var(--color-text-secondary)'}}>{farm.crop_name} · {farm.state}</p>
                </div>
              </div>
              <div style={{display:'flex', alignItems:'center', gap:'12px'}}>
                <span style={{color:'var(--color-text-secondary)', fontSize:'12px'}}>View Details</span>
                <span style={{color:'var(--color-text-secondary)', fontSize:'18px'}}>→</span>
              </div>
            </div>
          ))}
        </div>
        <style>{`
          .farm-selection-card:hover {
            border-color: var(--color-primary);
            background: var(--color-primary-light);
            transform: translateX(4px);
          }
        `}</style>
      </div>
    );
  }

  return (
    <div>
      <div style={{display:'flex', alignItems:'center', gap:'12px', marginBottom:'24px'}}>
        <button 
          onClick={() => {
            setSelectedFarmId(null);
            setSearchParams({ tab: 'milestones' });
          }} 
          style={{
            padding: '6px 14px',
            border: '1px solid #1a5d3b',
            background: 'white',
            color: '#1a5d3b',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}
        >
          ← Back
        </button>
        <div>
          <h1 style={{fontSize:'24px',fontWeight:700,fontFamily:'var(--font-heading)'}}>Milestones</h1>
          <p style={{color:'var(--color-text-secondary)', fontSize:'14px'}}>{selectedFarm.name} · {selectedFarm.crop_name}</p>
        </div>
      </div>
      
      <div style={{display:'flex',flexDirection:'column',gap:'20px'}}>
        {fetchingMilestones && milestones.length === 0 ? (
          <div style={{textAlign:'center', padding:'40px', color:'var(--color-text-secondary)', display:'flex', flexDirection:'column', alignItems:'center', gap:'12px'}}>
            <Spinner size="lg" />
            <span>Loading milestones...</span>
          </div>
        ) : milestones.length === 0 ? (
          <div style={{textAlign:'center', padding:'40px', color:'var(--color-text-secondary)'}}>No milestones found for this farm.</div>
        ) : milestones.map(m => (
          <div key={m.id} className="card milestone-card" style={{
            padding: '24px', 
            borderRadius: '16px', 
            border: '1px solid #f0f0f0', 
            boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
            opacity: m.status === 'locked' ? 0.7 : 1
          }}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'16px'}}>
              <div style={{flex: 1}}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', width: '100%', marginBottom: '4px'}}>
                   <h3 style={{fontSize:'18px', fontWeight:600}}>{m.name}</h3>
                   <span className={`badge badge-${
                    ['verified', 'disbursed'].includes(m.status) ? 'active' : 
                    ['under_review', 'pending_proof', 'rejected'].includes(m.status) ? 'pending' : 
                    'draft'}`} 
                    style={{ textTransform: 'capitalize', fontSize: '11px', padding: '4px 12px' }}>
                    {['verified', 'disbursed'].includes(m.status) ? 'Verified' : 
                     ['under_review', 'pending_proof', 'rejected'].includes(m.status) ? 'In Progress' : 
                     m.status === 'locked' ? 'Pending' : m.status}
                  </span>
                </div>
                <p style={{fontSize:'13px',color:'var(--color-text-secondary)', marginBottom: '12px'}}>
                  Due: {/* Assuming a due date exists, otherwise use expected week */}
                  {selectedFarm.start_date ? new Date(new Date(selectedFarm.start_date).getTime() + (m.expected_week * 7 * 24 * 60 * 60 * 1000)).toLocaleDateString('en-NG', {day:'numeric', month:'short', year:'numeric'}) : `Week ${m.expected_week}`}
                </p>

                {/* Sub-header pills based on status */}
                <div style={{display: 'flex', gap: '8px', marginBottom: '8px'}}>
                  {m.status === 'verified' && (
                    <div style={{
                      display: 'inline-flex', 
                      alignItems: 'center', 
                      gap: '6px', 
                      padding: '4px 12px', 
                      borderRadius: '999px', 
                      fontSize: '12px', 
                      background: 'rgba(26, 93, 59, 0.08)', 
                      color: '#1a5d3b',
                      fontWeight: 500
                    }}>
                      <Icon name="milestones" size={16} /> Approved <span style={{opacity: 0.6, fontSize: '11px', borderLeft: '1px solid rgba(26, 93, 59, 0.3)', paddingLeft: '8px', marginLeft: '2px'}}>— GPS verified.</span>
                    </div>
                  )}
                  {m.status === 'disbursed' && (
                    <div style={{
                      display: 'inline-flex', 
                      alignItems: 'center', 
                      gap: '6px', 
                      padding: '4px 12px', 
                      borderRadius: '999px', 
                      fontSize: '12px', 
                      background: 'rgba(16, 185, 129, 0.1)', 
                      color: '#059669',
                      fontWeight: 500
                    }}>
                      💰 Paid Out <span style={{opacity: 0.6, fontSize: '11px', borderLeft: '1px solid rgba(16, 185, 129, 0.3)', paddingLeft: '8px', marginLeft: '2px'}}>— Funds received.</span>
                    </div>
                  )}
                  {m.status === 'rejected' && (
                    <div style={{
                      display: 'inline-flex', 
                      alignItems: 'center', 
                      gap: '6px', 
                      padding: '4px 12px', 
                      borderRadius: '999px', 
                      fontSize: '12px', 
                      background: 'rgba(181, 74, 47, 0.08)', 
                      color: '#b54a2f',
                      fontWeight: 500
                    }}>
                      × Proof Rejected
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {m.status === 'rejected' && (
              <div style={{
                marginBottom:'16px', 
                padding:'16px', 
                background:'rgba(181,74,47,0.03)', 
                borderLeft:'4px solid #b54a2f', 
                borderRadius:'4px', 
                fontSize:'14px', 
                lineHeight:1.6
              }}>
                <strong style={{color:'#b54a2f', display:'block', marginBottom:'6px'}}>Admin note:</strong>
                {m.rejection_reason || "Proof did not meet requirements. Please check your photo and coordinates and resubmit."}
              </div>
            )}
            
            {/* Show camera proof uploader ONLY if it's pending proof or rejected */}
            {(m.status === 'pending_proof' || m.status === 'rejected') && (
              <ProofUpload key={m.id} milestone={m} onSuccess={handleSuccess} />
            )}
            
            {m.status === 'under_review' && (
              <div style={{marginTop:'16px',padding:'20px',background:'#f8f9fa',border:'1px solid #eee',borderRadius:'12px',fontSize:'14px',color:'var(--color-text-secondary)',textAlign:'center'}}>
                ⏳ Proof submitted and currently under review.
              </div>
            )}

            {m.status === 'locked' && (
              <div style={{
                marginTop:'12px', 
                padding:'16px', 
                background:'#f9f9f9', 
                borderRadius:'8px', 
                fontSize:'14px', 
                color:'var(--color-text-secondary)', 
                display:'flex', 
                alignItems:'center', 
                gap:'12px',
                lineHeight: 1.5
              }}>
                                <span style={{fontSize: '16px'}}>🔒</span> This stage is locked. It will be available once previous milestones are verified and funds are disbursed.
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function HarvestTab() {
  const { addToast } = useToast();
  const [ay, setAy] = useState('');
  const [totalSales, setTotalSales] = useState('');
  const [harvestDate, setHarvestDate] = useState('');
  const [evidence, setEvidence] = useState([]);
  const [selectedFarmId, setSelectedFarmId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [readyFarms, setReadyFarms] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [repaymentDetails, setRepaymentDetails] = useState(null);
  const [repaymentLoading, setRepaymentLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const { getRootProps, getInputProps } = useDropzone({ 
    accept: { 'image/*': [] },
    multiple: true,
    onDrop: async (files) => {
      if (!files?.length) return;

      const processed = await Promise.all(
        files.map(async (file) => {
          try {
            const compressed = await compressImageIfNeeded(file, FILE_LIMITS_MB.PAYMENT_PHOTO);
            if (compressed.size > mbToBytes(FILE_LIMITS_MB.PAYMENT_PHOTO)) {
              return null;
            }
            return compressed;
          } catch {
            return null;
          }
        })
      );

      const acceptedFiles = processed.filter(Boolean);
      const rejectedCount = files.length - acceptedFiles.length;

      if (acceptedFiles.length) {
        setEvidence((prev) => [...(Array.isArray(prev) ? prev : []), ...acceptedFiles]);
      }

      if (rejectedCount > 0) {
        addToast(
          `${rejectedCount} evidence file(s) exceeded ${FILE_LIMITS_MB.PAYMENT_PHOTO}MB after optimization.`,
          'error'
        );
      }
    },
    onDropRejected: () => {
      addToast('Some files were rejected. Please upload image files only.', 'error');
    },
  });

  const fetchReadyFarms = async () => {
    try {
      const res = await api.get('/farms/my-farms/ready-for-harvest');
      setReadyFarms(res.data.data || []);
    } catch (err) {
      console.error('Failed to load harvest-ready farms:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReadyFarms();
  }, []);

  const selectedFarm = readyFarms.find(f => f.id === selectedFarmId);
  const expectedYield = selectedFarm?.expected_yield || 0;
  const variance = ay && expectedYield ? (((parseFloat(ay) - expectedYield) / expectedYield) * 100).toFixed(1) : null;

  const verifiedReport = selectedFarm?.harvest_reports?.find(r => r.status === 'verified');
  const submittedReport = selectedFarm?.harvest_reports?.find(r => r.status === 'submitted');
  const isRepaid = selectedFarm?.repayment?.status === 'confirmed';

  useEffect(() => {
    if (verifiedReport && !isRepaid) {
      const fetchRepayment = async () => {
        setRepaymentLoading(true);
        try {
          const res = await api.get(`/harvest/farms/${selectedFarmId}/repayment/details`);
          setRepaymentDetails(res.data);
        } catch (err) {
          console.error("Failed to load repayment details:", err);
        } finally {
          setRepaymentLoading(false);
        }
      };
      fetchRepayment();
    } else {
      setRepaymentDetails(null);
    }
  }, [selectedFarmId, verifiedReport, isRepaid]);

  const handleRepay = async () => {
    if (!selectedFarmId) return;
    setRepaymentLoading(true);
    try {
      const res = await api.post(`/harvest/farms/${selectedFarmId}/repayment/initiate`);
      const { txn_ref, amount_kobo, merchant_code, payment_item_id, customer_email, customer_name } = res.data.data;
      
      const params = {
        merchant_code,
        pay_item_id: payment_item_id,
        txn_ref,
        amount: amount_kobo,
        cust_id: customer_email,
        cust_name: customer_name,
        cust_email: customer_email,
        currency: 566,
        site_redirect_url: window.location.origin,
        onComplete: async (response) => {
          if (response.resp === '00' || response.resp === '0' || response.status === 'successful') {
            await verifyRepayment(txn_ref);
          } else {
             addToast('Payment failed or cancelled', 'error');
             setRepaymentLoading(false);
          }
        },
        mode: 'TEST' // Change to 'PRODUCTION' in live
      };

      if (window.webpayCheckout) {
        window.webpayCheckout(params);
      } else {
        addToast('Payment gateway not loaded. Please refresh.', 'error');
        setRepaymentLoading(false);
      }
    } catch (err) {
      addToast(err.response?.data?.detail || "Failed to initiate repayment", "error");
      setRepaymentLoading(false);
    }
  };

  const verifyRepayment = async (txnRef) => {
    setIsVerifying(true);
    try {
      const res = await api.post('/harvest/repayment/verify', { txn_ref: txnRef });
      if (res.data.data.status === 'confirmed') {
        addToast('Repayment Confirmed!', 'success', 'Investor payouts have been generated.');
        // Refresh farms
        const newFarms = await api.get('/farms/my-farms/ready-for-harvest');
        setReadyFarms(newFarms.data.data || []);
      } else {
        addToast('Verification pending', 'warning', 'Please check back in a few minutes.');
      }
    } catch (err) {
      addToast('Verification failed', 'error');
    } finally {
      setIsVerifying(false);
      setRepaymentLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedFarmId || !ay || !totalSales || evidence.length === 0) return;
    
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('actual_yield', ay);
      formData.append('total_sales_declared', totalSales.toString().replace(/,/g, ''));
      formData.append('harvest_date', harvestDate);
      
      evidence.forEach(file => {
        formData.append('payment_evidences', file);
      });
      
      await api.post(`/harvest/farms/${selectedFarmId}/harvest-report`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      addToast('Harvest report submitted!', 'success', 'Verification step initiated.');
      
      // Refresh the list to remove the submitted farm
      await fetchReadyFarms();
      
      // Reset form
      setAy('');
      setTotalSales('');
      setEvidence([]); // Reset to empty array
      setSelectedFarmId('');
    } catch (err) {
      addToast(err.response?.data?.message || "Failed to submit harvest report", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (readyFarms.length === 0) {
    return (
      <div>
        <h1 style={{fontSize:'26px',fontWeight:700,marginBottom:'8px',fontFamily:'var(--font-heading)'}}>Harvest Reports</h1>
        <p style={{color:'var(--color-text-secondary)', marginBottom: '24px', fontSize: '14px'}}>Submit reports once your farm cycle is complete.</p>
        
        <div className="card" style={{padding:'48px 32px', textAlign:'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px'}}>
           <div style={{ color: 'var(--color-primary)', opacity: 0.5 }}>
             <Icon name="harvest" size={48} />
           </div>
           <div style={{maxWidth: '400px'}}>
             <h3 style={{fontWeight: 600, marginBottom: '8px'}}>No Farms Ready for Harvest</h3>
             <p style={{color:'var(--color-text-secondary)', fontSize: '14px', lineHeight: 1.6}}>
               Farms appear here automatically once **all** funding milestones have been verified and disbursed. Check your [Milestones](#) tab to track progress.
             </p>
           </div>
        </div>
      </div>
    );
  }

  if (!selectedFarmId) {
    return (
      <div>
        <h1 style={{fontSize:'26px',fontWeight:700,marginBottom:'8px',fontFamily:'var(--font-heading)'}}>Harvest Reports</h1>
        <p style={{color:'var(--color-text-secondary)', marginBottom: '24px', fontSize: '14px'}}>Track your harvest cycle and settle investor returns.</p>
        
        <div style={{display:'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px'}}>
          {readyFarms.map(farm => {
            const report = farm.harvest_reports?.[0];
            const repaid = farm.repayment?.status === 'confirmed';
            const reportStatus = report?.status;

            let badgeColor = 'var(--color-primary)';
            let badgeLabel = 'Ready to Report';
            let badgeBg = 'var(--color-primary-light)';
            let actionBtn = null;

            if (repaid) {
              badgeLabel = 'Settled'; badgeBg = 'rgba(16,185,129,0.1)'; badgeColor = '#059669';
              actionBtn = <div style={{width:'100%', padding:'10px', background:'rgba(16,185,129,0.1)', color:'#059669', borderRadius:'8px', textAlign:'center', fontWeight:600, fontSize:'13px'}}>✓ Repayment Confirmed</div>;
            } else if (reportStatus === 'verified') {
              badgeLabel = 'Action Required'; badgeBg = 'rgba(245,158,11,0.1)'; badgeColor = '#d97706';
              actionBtn = <button className="btn btn-solid btn-sm" style={{width:'100%', background:'#d97706'}} onClick={() => setSelectedFarmId(farm.id)}>💰 Complete Repayment</button>;
            } else if (reportStatus === 'submitted') {
              badgeLabel = 'Under Review'; badgeBg = 'rgba(59,130,246,0.1)'; badgeColor = '#3b82f6';
              actionBtn = <div style={{width:'100%', padding:'10px', background:'rgba(59,130,246,0.08)', color:'#3b82f6', borderRadius:'8px', textAlign:'center', fontSize:'13px'}}>⏳ Report under admin review</div>;
            } else {
              actionBtn = <button className="btn btn-solid btn-sm" style={{width:'100%'}} onClick={() => setSelectedFarmId(farm.id)}>Create Report</button>;
            }

            return (
              <div key={farm.id} className="card" style={{padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', border: '1px solid var(--color-border)'}}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'}}>
                  <div style={{width: '48px', height: '48px', borderRadius: '12px', background: badgeBg, color: badgeColor, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                    <Icon name="harvest" size={24} />
                  </div>
                  <span style={{padding:'4px 10px', borderRadius:'99px', fontSize:'11px', fontWeight:600, background:badgeBg, color:badgeColor}}>{badgeLabel}</span>
                </div>
                <div>
                  <h3 style={{fontWeight: 600, fontSize: '18px'}}>{farm.name}</h3>
                  <p style={{fontSize: '13px', color: 'var(--color-text-secondary)'}}>{farm.crop_name} · {farm.state}</p>
                </div>
                <div style={{padding: '12px', background: 'var(--color-surface)', borderRadius: '8px', fontSize: '12px'}}>
                  <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '4px'}}>
                    <span>Expected Yield:</span>
                    <strong>{farm.expected_yield} {farm.crop_name === 'Poultry' ? 'birds' : 'tons'}</strong>
                  </div>
                  <div style={{display: 'flex', justifyContent: 'space-between'}}>
                    <span>Cycle Start:</span>
                    <strong>{new Date(farm.start_date).toLocaleDateString()}</strong>
                  </div>
                </div>
                {actionBtn}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px'}}>
        <button onClick={() => setSelectedFarmId('')} className="btn-ghost" style={{padding: '8px', borderRadius: '8px'}}><Icon name="farms" size={20} /></button>
        <div>
          <h1 style={{fontSize:'24px',fontWeight:700,fontFamily:'var(--font-heading)'}}>Harvest Report</h1>
          <p style={{color:'var(--color-text-secondary)', fontSize:'14px'}}>{selectedFarm.name} · {selectedFarm.crop_name}</p>
        </div>
      </div>

      <div className="card" style={{padding:'28px',maxWidth:'600px',display:'flex',flexDirection:'column',gap:'20px'}}>
        {verifiedReport ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ padding: '20px', background: 'var(--color-primary-light)', borderRadius: '12px', border: '1px solid var(--color-primary-light)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--color-primary)', marginBottom: '8px' }}>
                <Icon name="milestones" size={20} />
                <h3 style={{ fontWeight: 700, fontSize: '16px', margin: 0 }}>Report Verified</h3>
              </div>
              <p style={{ fontSize: '13px', lineHeight: 1.5, color: 'var(--color-text-secondary)' }}>
                Your harvest report has been verified by the platform. You are now required to settle the total investment plus the agreed ROI.
              </p>
            </div>
            
            <div style={{ background: 'var(--color-surface)', padding: '16px', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '8px', textTransform: 'uppercase', color: 'var(--color-text-secondary)' }}>Repayment Summary</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '4px' }}>
                <span>Actual Yield:</span>
                <strong>{verifiedReport.actual_yield} units</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                <span>Confirmed Sales:</span>
                <strong>₦{verifiedReport.admin_confirmed_sales?.toLocaleString()}</strong>
              </div>
            </div>

            {repaymentDetails?.is_test_mode_scaled && (
              <div style={{ padding:'12px', background: 'rgba(26,107,60,0.05)', borderLeft: '3px solid var(--color-primary)', borderRadius: '4px', marginBottom: '16px' }}>
                <p style={{ fontSize: '13px', color: 'var(--color-primary)', fontWeight: 600, marginBottom: '4px' }}>
                  🚀 Smart Scaling Active (Hackathon Mode)
                </p>
                <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>
                  Your total settlement of <strong>₦{(repaymentDetails.total_repayment).toLocaleString()}</strong> exceeds the sandbox limit. 
                  The gateway will process <strong>₦{repaymentDetails.scaled_repayment.toLocaleString()}</strong> ({repaymentDetails.scale_factor}x scale), but your full repayment will be recorded.
                </p>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--color-border)' }}>
                 <span style={{ color: 'var(--color-text-secondary)' }}>Principal (Raised Amount)</span>
                 <strong className="text-mono">{formatCurrency(repaymentDetails?.principal || 0)}</strong>
               </div>
               <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--color-border)' }}>
                 <span style={{ color: 'var(--color-text-secondary)' }}>Interest / ROI ({((repaymentDetails?.roi_rate || 0) * 100).toFixed(1)}%)</span>
                 <strong className="text-mono" style={{ color: 'var(--color-primary)' }}>+{formatCurrency(repaymentDetails?.gain || 0)}</strong>
               </div>
               <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 0', marginTop: '4px' }}>
                 <span style={{ fontWeight: 600, fontSize: '16px' }}>Total Settlement</span>
                 <strong className="text-mono" style={{ fontSize: '20px', color: 'var(--color-text-primary)' }}>{formatCurrency(repaymentDetails?.total_repayment || 0)}</strong>
               </div>
            </div>

            {isRepaid ? (
              <div style={{ padding: '16px', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--color-primary)', borderRadius: '8px', textAlign: 'center', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <Icon name="milestones" size={18} /> Repayment Confirmed & Settled
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <button 
                  className="btn btn-solid" 
                  style={{ width: '100%', padding: '14px', fontSize: '15px' }} 
                  disabled={repaymentLoading || !repaymentDetails}
                  onClick={handleRepay}
                >
                  {repaymentLoading ? <Spinner size="sm" /> : `Pay ${formatCurrency(repaymentDetails?.total_repayment || 0)}`}
                </button>
                <p style={{ fontSize: '11px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                  Securely processed by Interswitch. Immediate investor payouts will be triggered.
                </p>
              </div>
            )}
          </div>
        ) : submittedReport ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ padding: '20px', background: 'rgba(59, 130, 246, 0.05)', borderRadius: '12px', border: '1px solid rgba(59, 130, 246, 0.1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#3b82f6', marginBottom: '8px' }}>
                <Icon name="harvest" size={20} />
                <h3 style={{ fontWeight: 700, fontSize: '16px', margin: 0 }}>Report Under Review</h3>
              </div>
              <p style={{ fontSize: '13px', lineHeight: 1.5, color: 'var(--color-text-secondary)' }}>
                Your harvest report has been submitted successfully. Our admin team will verify your sales data and confirm the final ROI before you can proceed with repayment.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ background: 'var(--color-surface)', padding: '20px', borderRadius: '12px', border: '1px solid var(--color-border)' }}>
                 <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '16px', textTransform: 'uppercase', color: 'var(--color-text-secondary)', letterSpacing: '0.05em' }}>Submission Details</div>
                 
                 <div style={{ display: 'grid', gap: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>Actual Yield</span>
                      <strong style={{ fontSize: '15px' }}>{submittedReport.actual_yield} units</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>Declared Sales</span>
                      <strong style={{ fontSize: '15px', color: 'var(--color-primary)' }}>₦{submittedReport.total_sales_declared.toLocaleString()}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>Harvest Date</span>
                      <strong style={{ fontSize: '15px' }}>{new Date(submittedReport.harvest_date).toLocaleDateString()}</strong>
                    </div>
                 </div>
              </div>

              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '12px' }}>Sales Evidence ({submittedReport.payment_evidence_urls?.length || 0})</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '12px' }}>
                  {submittedReport.payment_evidence_urls?.map((url, idx) => (
                    <div key={idx} style={{ width: '100%', height: '120px', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--color-border)' }}>
                      <img src={url} alt={`Evidence ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <button className="btn btn-ghost" style={{ width: '100%' }} onClick={() => setSelectedFarmId('')}>Back to Harvest List</button>
          </div>
        ) : (
          <>
            <div style={{padding: '16px', background: 'rgba(57, 102, 57, 0.05)', borderRadius: '12px', border: '1px solid var(--color-primary-light)', fontSize: '13px', lineHeight: 1.5}}>
               <Icon name="milestones" size={16} /> <strong>Final Verification Step:</strong> Please provide accurate yield and sales data. This will be verified against your uploaded evidence before ROI is settled with investors.
            </div>

            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px'}}>
              <div className="form-group">
                <label className="form-label">Actual Yield ({selectedFarm?.crop_name === 'Poultry' ? 'birds' : 'tons'})</label>
                <input className="form-input" type="number" value={ay} onChange={e=>setAy(e.target.value)} placeholder={`Expected: ${expectedYield}`}/>
              </div>
              <div className="form-group">
                <label className="form-label">Harvest Date</label>
                <input className="form-input" type="date" value={harvestDate} onChange={e => setHarvestDate(e.target.value)}/>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Total Gross Sales (₦)</label>
              <CurrencyInput className="form-input text-mono" style={{fontSize: '18px', fontWeight: 700}} value={totalSales} onChange={e => setTotalSales(e.target.value)} placeholder="0.00"/>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:'12px',color:'var(--color-text-secondary)',marginTop:'4px'}}>
                <span>Total amount received from selling this harvest.</span>
                <span>Expected: <strong>₦{selectedFarm?.expected_revenue?.toLocaleString()}</strong></span>
              </div>
            </div>
            
            <div className="form-group">
              <label className="form-label">Sales Evidence (Receipts/Bank Alerts) <span style={{color:'var(--color-danger)'}}>*</span></label>
              <div {...getRootProps()} style={{border:'2px dashed var(--color-border)',padding:'32px 20px',borderRadius:'12px',textAlign:'center',cursor:'pointer',background:evidence.length > 0 ?'rgba(57, 102, 57, 0.05)':'transparent',borderColor:evidence.length > 0 ?'var(--color-primary)':'var(--color-border)', transition: 'all 0.2s ease'}}>
                <input {...getInputProps()}/>
                <div style={{marginBottom: '12px', color: evidence.length > 0 ? 'var(--color-primary)' : 'var(--color-text-muted)'}}>
                  <Icon name="camera" size={32} />
                </div>
                {evidence.length > 0 ? (
                  <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
                    <div style={{display:'flex',flexWrap:'wrap',gap:'8px',justifyContent:'center'}}>
                      {evidence.map((file, idx) => (
                        <div key={idx} style={{position:'relative',width:'60px',height:'60px',borderRadius:'8px',overflow:'hidden',border:'1px solid var(--color-border)'}}>
                          <img src={URL.createObjectURL(file)} alt="preview" style={{width:'100%',height:'100%',objectFit:'cover'}} />
                        </div>
                      ))}
                      {/* Add more button */}
                      <div style={{width:'60px',height:'60px',borderRadius:'8px',border:'2px dashed var(--color-border)',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--color-primary)',background:'var(--color-surface)'}}>
                        <Icon name="add" size={24} />
                      </div>
                    </div>
                    <span style={{color:'var(--color-primary)',fontWeight:600,fontSize:'13px'}}>✓ {evidence.length} file{evidence.length > 1 ? 's' : ''} attached</span>
                    <button type="button" onClick={(e) => { e.stopPropagation(); setEvidence([]); }} style={{border:'none',background:'none',color:'var(--color-danger)',fontSize:'12px',fontWeight:600,cursor:'pointer',opacity:0.7,marginTop:'4px'}}>Clear All</button>
                  </div>
                ) : (
                  <div>
                    <span style={{fontSize:'14px',fontWeight:500,display:'block',marginBottom:'4px'}}>Click to upload payment photos</span>
                    <span style={{fontSize:'12px',color:'var(--color-text-secondary)'}}>PNG or JPG up to {FILE_LIMITS_MB.PAYMENT_PHOTO}MB each</span>
                  </div>
                )}
              </div>
            </div>

            {variance !== null && (
              <div style={{padding:'16px',background:'var(--color-surface)',borderRadius:'12px',fontSize:'13px',display:'flex',justifyContent: 'space-between', alignItems: 'center', border:'1px solid var(--color-border)'}}>
                <div style={{display: 'flex', gap: '20px'}}>
                  <span>Expected: <strong>{expectedYield}</strong></span>
                  <span>Reported: <strong>{ay}</strong></span>
                </div>
                <div style={{display: 'flex', alignItems: 'center', gap: '6px', color:parseFloat(variance) > -15 ? 'var(--color-primary)' : 'var(--color-danger)', fontWeight: 600}}>
                  {parseFloat(variance) > -15 ? '✓' : '⚠️'}
                  {variance > 0 ? '+' : ''}{variance}% Variance
                </div>
              </div>
            )}

            <div style={{display: 'flex', gap: '12px', marginTop: '8px'}}>
              <button className="btn btn-ghost" style={{flex: 1}} onClick={() => setSelectedFarmId('')} disabled={isSubmitting}>Cancel</button>
              <button className="btn btn-solid" style={{flex: 2}} disabled={!selectedFarmId || !ay || !totalSales || !evidence || isSubmitting} onClick={handleSubmit}>
                {isSubmitting ? <Spinner size="sm" /> : 'Submit Final Report'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function FarmerDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab] = useState(searchParams.get('tab') || 'farms');
  const hasMountedTabRefreshRef = useRef(false);
  
  useEffect(() => {
    const currentTab = searchParams.get('tab') || 'farms';
    if (tab !== currentTab) setTab(currentTab);
  }, [searchParams]);

  const [done, setDone] = useState(false);
  const draftFarmId = searchParams.get('draftFarmId');

  const handleTabChange = (k) => {
    setTab(k);
    setSearchParams({ tab: k });
    setDone(false);
  };

  const ITEMS_PER_PAGE = 5;
  const [farmsPage, setFarmsPage] = useState(1);
  const fbStart = (farmsPage - 1) * ITEMS_PER_PAGE;
  const { user, logout, fetchProfile } = useAuth();
  const { addToast } = useToast();
  const [isKycOpen, setIsKycOpen] = useState(false);
  const [farms, setFarms] = useState([]);
  const [loadingFarms, setLoadingFarms] = useState(true);
  const [banks, setBanks] = useState([]);

  const fetchFarms = useCallback(async () => {
    try {
      const res = await api.get('/farms/my-farms');
      setFarms(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingFarms(false);
    }
  }, []);

  const fetchBanks = useCallback(async () => {
    try {
      const res = await api.get('/banks');
      setBanks(res.data.data);
    } catch (err) {
      console.error("Failed to load banks");
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        await Promise.allSettled([
          fetchProfile(),
          fetchFarms(),
          fetchBanks()
        ]);
      } catch (err) {
        console.error("Dashboard initialization failed", err);
      }
    };
    init();

    // Auto-refresh every 30 seconds (only if window is focused)
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchProfile();
        fetchFarms();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchProfile, fetchFarms, fetchBanks]);

  useEffect(() => {
    if (!hasMountedTabRefreshRef.current) {
      hasMountedTabRefreshRef.current = true;
      return;
    }

    if (document.visibilityState !== 'visible') return;

    fetchProfile();
    fetchFarms();
    if (tab === 'settings') {
      fetchBanks();
    }
  }, [tab, fetchProfile, fetchFarms, fetchBanks]);

  const displayFarms = farms;
  const paginatedFarms = displayFarms.slice(fbStart, fbStart + ITEMS_PER_PAGE);
  const draftFarmToContinue =
    (tab === 'add' && draftFarmId)
      ? farms.find((farm) => farm.id === draftFarmId && farm.farm_status === 'draft')
      : null;
  const [payoutDetails, setPayoutDetails] = useState({ accountName: '', bankCode: '', accountNumber: '' });
  const [detailsSaved, setDetailsSaved] = useState(false);
  const kycComplete = user?.bvn_verified && user?.bank_verified;
  const navigate = useNavigate();

  const handleSavePayout = async () => {
    if (!payoutDetails.accountName || !payoutDetails.accountNumber || !payoutDetails.bankCode) return;
    try {
      await api.post('/auth/payout-settings', payoutDetails);
      setDetailsSaved(true);
      addToast('Payout details saved!', 'success');
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to save payout details', 'error');
    }
  };

  const handleDeleteFarm = async (farmId) => {
    if (!window.confirm("Are you sure you want to delete this farm? This action cannot be undone.")) return;
    try {
      await api.delete(`/farms/${farmId}`);
      addToast('Farm deleted', 'success');
      fetchFarms();
    } catch (err) {
      addToast(err.response?.data?.detail || 'Delete failed', 'error');
    }
  };

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
                    {user?.bvn_verified ? '✓ BVN Verified' : 'Verify BVN'}
                  </span>
                  <span style={{ color: 'var(--color-text-muted)' }}>→</span>
                  <span style={{ 
                    color: user?.bank_verified ? 'var(--color-primary)' : 'var(--color-text-secondary)', 
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    {user?.bank_verified ? '✓ Bank Account Added' : 'Add Bank Account'}
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
            <div className="card" style={{ padding: '24px', marginBottom: '28px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '16px', overflow: 'hidden', position: 'relative' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: user?.bvn_verified ? 'var(--color-primary)' : 'var(--color-accent)' }}></div>
              <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '1px' }}>Your Trust Score</h3>
              
              {!user?.bvn_verified ? (
                <div style={{ textAlign: 'center', padding: '12px 0' }}>
                  <p style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '4px' }}>Complete KYC verification</p>
                  <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>to receive your score and start listing farms</p>
                </div>
              ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '32px', alignItems: 'center' }}>
                    <div style={{ textAlign: 'center', flex: '1 0 100px', borderRight: '1px solid var(--color-border)', paddingRight: '12px' }}>
                      <div style={{ fontSize: '42px', fontWeight: 800, color: 'var(--color-primary)', lineHeight: 1 }}>{user?.trust_score || 0}</div>
                      <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', fontWeight: 600, marginTop: '4px' }}>/ 100</div>
                    </div>
                    
                    <div style={{ flex: '2 1 300px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span className="badge badge-active" style={{ background: 'var(--color-primary)', color: '#fff', fontSize: '11px', fontWeight: 700 }}>
                          {user?.trust_tier === 'verified' ? 'Verified Farmer' : user?.trust_tier === 'emerging' ? 'Emerging Farmer' : 'Unrated'}
                        </span>
                        <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
                          {user?.trust_score >= 80 ? 'Excellent Standing' : 'Growing Trust'}
                        </span>
                      </div>
                      <div className="progress-track" style={{ height: '12px', background: 'var(--color-border)', borderRadius: '6px' }}>
                        <div className="progress-fill" style={{ width: `${user?.trust_score || 0}%`, background: 'var(--color-primary)', borderRadius: '6px' }}></div>
                      </div>
                    </div>
                    
                    <div style={{ flex: '1 1 260px', fontSize: '15px', color: 'var(--color-text-secondary)', lineHeight: 1.5, fontWeight: 500 }}>
                      Complete more farms to earn additional points. All farmers are <span style={{color: 'var(--color-text-primary)', fontWeight: 600}}>BVN-verified</span>.
                    </div>
                  </div>
              )}
            </div>

            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'28px'}}>
              <h1 style={{fontSize:'26px',fontWeight:700,fontFamily:'var(--font-heading)'}}>My Farms</h1>
              <button className="btn btn-solid btn-sm" onClick={() => kycComplete ? handleTabChange('add') : setIsKycOpen(true)}>+ Add Farm</button>
            </div>

            {/* Deadline-passed decision banner */}
            {displayFarms.some(f => f.status === 'deadline_passed') && displayFarms.filter(f => f.status === 'deadline_passed').map(farm => (
              <div key={`dp-${farm.id}`} style={{background:'rgba(180,120,0,0.07)',border:'2px solid var(--color-accent)',borderRadius:'12px',padding:'20px 24px',marginBottom:'20px'}}>
                <div style={{display:'flex',gap:'12px',alignItems:'flex-start',marginBottom:'14px'}}>
                  <div style={{width:'32px',height:'32px',backgroundColor:'var(--color-accent)',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,color:'#fff'}}>!</div>
                  <div>
                    <p style={{fontWeight:700,fontSize:'15px',marginBottom:'4px'}}>Your farm "{farm.name}" did not reach its funding goal of ₦{(farm.total_budget||0).toLocaleString()}</p>
                    <p style={{fontSize:'13px',color:'var(--color-text-secondary)',lineHeight:1.5}}>You raised ₦{(farm.amount_raised||0).toLocaleString()} ({farm.total_budget ? Math.round((farm.amount_raised/farm.total_budget)*100) : 0}%). You have <strong>47 hours</strong> to decide:</p>
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
                  const pct = farm.total_budget > 0 ? Math.round((farm.amount_raised / farm.total_budget) * 100) : 0;
                  
                  let statusBadge = 'draft';
                  let statusLabel = farm.farm_status;
                  let showProgress = true;
                  
                  switch(farm.farm_status) {
                    case 'active': 
                      statusBadge = 'active'; 
                      statusLabel = 'Active'; 
                      break;
                    case 'pending': 
                      statusBadge = 'pending'; 
                      statusLabel = 'Under Admin Review'; 
                      showProgress = false;
                      break;
                    case 'draft': 
                      statusBadge = 'draft'; 
                      statusLabel = 'Incomplete'; 
                      showProgress = false;
                      break;
                    case 'funded': 
                      statusBadge = 'active'; 
                      statusLabel = 'Fully Funded'; 
                      break;
                    case 'deadline_passed': 
                      statusBadge = 'pending'; 
                      statusLabel = 'Deadline Passed'; 
                      break;
                    case 'rejected': 
                    case 'cancelled': 
                      statusBadge = 'danger'; 
                      statusLabel = farm.farm_status.charAt(0).toUpperCase() + farm.farm_status.slice(1);
                      break;
                    default: 
                      statusLabel = farm.farm_status?.charAt(0).toUpperCase() + farm.farm_status?.slice(1);
                  }

                  const isReadyForHarvest = farm.is_harvest_ready;
                  const isIncompleteRegistration = farm.farm_status === 'draft';
                  const hasUploadableMilestone = Array.isArray(farm.milestones)
                    && farm.milestones.some((m) => ['pending_proof', 'rejected'].includes(m.status));

                  return (
                    <div key={farm.id} className="card" style={{padding:'20px 24px', opacity:['cancelled','rejected'].includes(farm.farm_status)?0.7:1}}>
                      <div style={{display:'flex',alignItems:'center',gap:'16px',flexWrap:'wrap'}}>
                        <div style={{flex:1,minWidth:'160px'}}>
                          <h3 style={{fontWeight:600,fontSize:'16px'}}>{farm.name}</h3>
                          <p style={{fontSize:'13px',color:'var(--color-text-secondary)'}}>{farm.crop_name} · {farm.state}</p>
                        </div>
                        
                        <div style={{display: 'flex', gap: '8px'}}>
                          <span className={`badge badge-${statusBadge}`}>{statusLabel}</span>
                          {isReadyForHarvest && <span className="badge badge-active" style={{background: 'var(--color-primary)', color: '#fff', border: 'none'}}>Ready for Harvest</span>}
                        </div>
                        
                        {showProgress && (
                           <div style={{display:'flex',alignItems:'center',gap:'10px',minWidth:'180px'}}>
                             <div className="progress-track" style={{flex:1}}><div className="progress-fill" style={{width:`${pct}%`}}/></div>
                             <span className="text-mono" style={{fontSize:'13px',fontWeight:600}}>{pct}%</span>
                           </div>
                        )}
                        
                        <div style={{display:'flex',gap:'8px'}}>
                          {!isIncompleteRegistration && (
                            <button
                              className="btn btn-ghost btn-sm"
                              onClick={() => {
                                setTab('milestones');
                                setSearchParams({ tab: 'milestones', farmId: farm.id });
                              }}
                            >
                              Manage
                            </button>
                          )}

                          {isIncompleteRegistration && (
                            <button
                              className="btn btn-solid btn-sm"
                              onClick={() => {
                                setTab('add');
                                setSearchParams({ tab: 'add', draftFarmId: farm.id });
                              }}
                            >
                              Continue Registration
                            </button>
                          )}
                          
                          {['draft', 'rejected', 'cancelled'].includes(farm.farm_status) && (
                            <button className="btn btn-ghost btn-sm" style={{color:'var(--color-danger)'}} onClick={() => handleDeleteFarm(farm.id)}>Delete</button>
                          )}
                          
                          {isReadyForHarvest ? (
                            <button className="btn btn-solid btn-sm" onClick={() => handleTabChange('harvest')}>
                              Report Harvest
                            </button>
                          ) : hasUploadableMilestone && !isIncompleteRegistration && !['deadline_passed','cancelled','rejected','completed','paid_out'].includes(farm.farm_status) && (
                            <button className="btn btn-solid btn-sm" onClick={() => {
                              setTab('milestones');
                              setSearchParams({ tab: 'milestones', farmId: farm.id });
                            }}>Upload Proof</button>
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
                <div style={{
                  width: '64px',
                  height: '64px',
                  backgroundColor: 'rgba(245, 158, 11, 0.1)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                  color: '#f59e0b'
                }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                  </svg>
                </div>
                <h3 style={{fontWeight:600,fontSize:'18px',marginBottom:'8px'}}>Verification Required</h3>
                <p style={{color:'var(--color-text-secondary)',marginBottom:'24px',maxWidth:'400px',margin:'0 auto 24px'}}>You must complete your BVN and Bank Account verification in Settings before creating a farm.</p>
                <button className="btn btn-solid" onClick={() => handleTabChange('settings')}>Go to Settings</button>
              </div>
            ) : done ? (
              <div className="card" style={{padding:'64px 48px',textAlign:'center'}}>
                <div style={{
                  width: '80px',
                  height: '80px',
                  backgroundColor: 'rgba(16, 185, 129, 0.1)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 24px',
                  color: '#10b981'
                }}>
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </div>
                <h2 style={{fontWeight:700,fontSize:'24px',marginBottom:'12px',color:'var(--color-text-primary)'}}>Submitted for Review</h2>
                <p style={{color:'var(--color-text-secondary)',fontSize:'16px',maxWidth:'320px',margin:'0 auto'}}>Our team will review your farm listing within 24 hours.</p>
                <button className="btn btn-solid" style={{marginTop:'32px',padding:'12px 32px'}} onClick={()=>{setDone(false);handleTabChange('farms');}}>Back to My Farms</button>
              </div>
            ) : <FarmCreationForm continueFarm={draftFarmToContinue} onDone={() => { setDone(true); fetchFarms(); }}/>}
          </div>
        )}

        {tab==='milestones' && <MilestonesTab farms={farms} />}
        {tab==='harvest' && <HarvestTab />}

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
                <div className="form-group"><label className="form-label">Email</label><input className="form-input" defaultValue={user?.email} disabled /></div>
                <div className="form-group"><label className="form-label">Short Bio</label><textarea className="form-input form-textarea" rows={3} placeholder="Tell investors about your farming experience…"/></div>
                <button className="btn btn-solid">Save Changes</button>
              </div>

              {/* Verification Status */}
              <div
                className="card"
                style={{ padding: "24px", flex: "1 1 300px", maxWidth: "480px" }}
              >
                <h3 style={{ fontWeight: 600, marginBottom: "16px" }}>
                  Trust & Verification
                </h3>
                <p style={{ fontSize: "13px", color: "var(--color-text-secondary)", marginBottom: "20px", lineHeight: 1.5 }}>
                  Complete your verification to build trust with investors and unlock full platform capabilities.
                </p>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: user?.bvn_verified ? 'rgba(16, 185, 129, 0.05)' : 'var(--color-surface)', borderRadius: '8px', border: user?.bvn_verified ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid var(--color-border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '18px' }}>🆔</span>
                      <span style={{ fontSize: '14px', fontWeight: 500 }}>BVN Verification</span>
                    </div>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: user?.bvn_verified ? 'var(--color-primary)' : 'var(--color-text-secondary)' }}>
                      {user?.bvn_verified ? '✓ VERIFIED' : 'PENDING'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: user?.bank_verified ? 'rgba(16, 185, 129, 0.05)' : 'var(--color-surface)', borderRadius: '8px', border: user?.bank_verified ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid var(--color-border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '18px' }}>🏦</span>
                      <span style={{ fontSize: '14px', fontWeight: 500 }}>Bank Account</span>
                    </div>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: user?.bank_verified ? 'var(--color-primary)' : 'var(--color-text-secondary)' }}>
                      {user?.bank_verified ? '✓ VERIFIED' : 'PENDING'}
                    </span>
                  </div>
                </div>

                {!kycComplete && (
                  <button 
                    className="btn btn-solid btn-full" 
                    style={{ background: 'var(--color-primary)' }}
                    onClick={() => setIsKycOpen(true)}
                  >
                    Complete Verification
                  </button>
                )}
                
                {user?.trust_score !== undefined && (
                  <div style={{ marginTop: '16px', borderTop: '1px solid var(--color-border)', paddingTop: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>Current Trust Score:</span>
                      <span style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{user.trust_score}/100</span>
                    </div>
                    <div className="progress-track" style={{ height: '6px' }}>
                      <div className="progress-fill" style={{ width: `${user.trust_score}%` }}></div>
                    </div>
                  </div>
                )}
              </div>
                
              <div
                className="card"
                style={{ padding: "24px", flex: "1 1 320px", maxWidth: "600px" }}
              >
                <h3 style={{ fontWeight: 600, marginBottom: "16px" }}>
                  Payout Destination
                </h3>
                <p
                  style={{
                    fontSize: "13px",
                    color: "var(--color-text-secondary)",
                    marginBottom: "24px",
                    lineHeight: 1.5,
                  }}
                >
                  Proceeds from your farm projects are automatically disbursed to this account. To change these details, update your bank verification.
                </p>

                {user?.bank_verified ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ padding: '16px', background: 'var(--color-surface)', borderRadius: '12px', border: '1px solid var(--color-border)' }}>
                       <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', textTransform: 'uppercase', marginBottom: '4px', fontWeight: 600 }}>Bank Name</div>
                       <div style={{ fontWeight: 600 }}>{banks.find(b => b.code === user.bank_code)?.name || user.bank_code || 'Verified Bank'}</div>
                    </div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      <div style={{ padding: '16px', background: 'var(--color-surface)', borderRadius: '12px', border: '1px solid var(--color-border)' }}>
                         <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', textTransform: 'uppercase', marginBottom: '4px', fontWeight: 600 }}>Account Number</div>
                         <div className="text-mono" style={{ fontWeight: 700, fontSize: '16px' }}>{user.bank_account_number}</div>
                      </div>
                      <div style={{ padding: '16px', background: 'var(--color-surface)', borderRadius: '12px', border: '1px solid var(--color-border)' }}>
                         <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', textTransform: 'uppercase', marginBottom: '4px', fontWeight: 600 }}>Account Name</div>
                         <div style={{ fontWeight: 600, fontSize: '14px' }}>{user.bank_account_name}</div>
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-primary)', fontSize: '13px', fontWeight: 500, marginTop: '8px' }}>
                      <Icon name="milestones" size={16} />
                      Verified for Automated Payouts
                    </div>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '32px 16px', background: 'rgba(57, 102, 57, 0.05)', borderRadius: '12px', border: '1px dashed var(--color-primary)' }}>
                     <div style={{ color: 'var(--color-primary)', marginBottom: '12px' }}>
                       <Icon name="bank" size={32} />
                     </div>
                     <h4 style={{ fontWeight: 600, marginBottom: '8px' }}>No Verified Destination</h4>
                     <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '16px' }}>
                       Complete your bank verification to receive farm proceeds.
                     </p>
                     <button className="btn btn-solid btn-sm" onClick={() => setIsKycOpen(true)}>Verify Bank Now</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
    </DashboardLayout>
    <KYCModal isOpen={isKycOpen} onClose={() => setIsKycOpen(false)} role="farmer" />
    </>
  );
}
