import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import KYCModal from "../components/KYCModal";
import api from "../utils/api";
import EmptyState from "../components/EmptyState";
import DashboardLayout from "../components/DashboardLayout";
import Pagination from "../components/Pagination";

const navItems = [
  { key: "overview", label: "Overview", icon: "overview" },
  { key: "investments", label: "My Investments", icon: "investments" },
  { key: "payouts", label: "Expected Payouts", icon: "payments" },
  { key: "returns", label: "Returns", icon: "returns" },
  { key: "explore", label: "Explore Farms", icon: "explore" },
  { key: "settings", label: "Settings", icon: "settings" },
];

export default function InvestorDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab] = useState(searchParams.get("tab") || "overview");

  useEffect(() => {
    const currentTab = searchParams.get("tab") || "overview";
    if (tab !== currentTab) setTab(currentTab);
  }, [searchParams]);

  const navigate = useNavigate();

  const handleTabChange = (k) => {
    if (k === "explore") {
      navigate("/farms");
      return;
    }
    setTab(k);
    setSearchParams({ tab: k });
  };

  const [viewMode, setViewMode] = useState("table");
  const [payoutsViewMode, setPayoutsViewMode] = useState("timeline");
  const [payoutDetails, setPayoutDetails] = useState({
    accountName: "",
    bankCode: "",
    accountNumber: "",
  });
  const [detailsSaved, setDetailsSaved] = useState(false);

  const handleSavePayout = async () => {
    if (!payoutDetails.accountName || !payoutDetails.accountNumber || !payoutDetails.bankCode) return;
    try {
      await api.post('/auth/payout-settings', payoutDetails);
      setDetailsSaved(true);
      await fetchProfile();
    } catch (err) {
      console.error('Failed to save payout details', err);
    }
  };
  const { user, logout, fetchProfile } = useAuth();
  const [isKycOpen, setIsKycOpen] = useState(false);
  
  const [investments, setInvestments] = useState([]);
  const [expectedPayouts, setExpectedPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [banks, setBanks] = useState([]);

  const initData = async () => {
    try {
      const [invRes, payRes, bankRes] = await Promise.all([
        api.get("/investments"),
        api.get("/investments/payouts/expected"),
        api.get("/banks")
      ]);
      setInvestments(invRes.data.data);
      setExpectedPayouts(payRes.data.data);
      setBanks(bankRes.data.data || []);
      
      // Update local payout details from user object if available
      if (user?.bank_account_number) {
        setPayoutDetails({
          accountName: user.bank_account_name || "",
          bankCode: user.bank_code || "",
          accountNumber: user.bank_account_number || "",
        });
        setDetailsSaved(true);
      }
    } catch (err) {
      console.error("Failed to fetch dashboard data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
    initData();
  }, []);

  const kycComplete = user?.bvn_verified && user?.bank_verified;

  const [payoutsPage, setPayoutsPage] = useState(1);
  const ITEMS_PER_PAGE = 4;
  useEffect(() => setPayoutsPage(1), [payoutsViewMode]);

  const pbStart = (payoutsPage - 1) * ITEMS_PER_PAGE;
  const displayPortfolio = investments;
  const displayPayouts = expectedPayouts;
  const displayAllPayouts = expectedPayouts.filter(p => p.statusStep === 5);
  const paginatedPayouts = displayPayouts.slice(
    pbStart,
    pbStart + ITEMS_PER_PAGE,
  );

  const totalInvested = displayPortfolio.reduce((s, i) => s + i.amount, 0);
  const totalExpectedPayout = displayPortfolio.reduce(
    (s, i) => s + (i.expected_return || 0),
    0,
  );
  const totalExpectedProfit = displayPortfolio.reduce(
    (s, i) => s + ((i.expected_return || 0) - (i.amount || 0)),
    0,
  );
  const receivedToDate = displayAllPayouts
    .filter((p) => p.status === "successful")
    .reduce((s, p) => {
      const profit =
        typeof p.profit === "number"
          ? p.profit
          : p.payout_amount != null && p.amount_invested != null
            ? p.payout_amount <= p.amount_invested
              ? p.payout_amount
              : p.payout_amount - p.amount_invested
            : p.payout_amount || 0;
      const total =
        typeof p.totalToSend === "number"
          ? p.totalToSend
          : p.amount_invested != null
            ? (p.amount_invested || 0) + profit
            : p.payout_amount || 0;
      return s + (total || 0);
    }, 0);
  const activeFarms = displayPortfolio.filter(
    (i) => i.status === "confirmed",
  ).length;

  const totalExpectedDisplay = user?.isNewUser ? 0 : 226000;
  const inTransitDisplay = user?.isNewUser ? 0 : 62000;
  const receivedDisplay = user?.isNewUser ? 0 : 30500;
  const activeFarmsCount = user?.isNewUser ? 0 : 4;
  const historicPayoutsCount = user?.isNewUser ? 0 : 1;

  const navFooter = (
    <>
      <div
        style={{
          fontSize: "13px",
          color: "var(--color-text-secondary)",
          marginBottom: "8px",
        }}
      >
        {user?.name}
      </div>
      <button
        className="btn btn-ghost btn-sm btn-full"
        onClick={() => {
          logout();
          navigate("/auth");
        }}
      >
        Log Out
      </button>
    </>
  );

  console.log(user);
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Morning";
    if (hour < 17) return "Afternoon";
    return "Evening";
  };
  
  return (
    <>
    <DashboardLayout
      navItems={navItems}
      activeTab={tab}
      onTabChange={handleTabChange}
      footer={navFooter}
    >
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
                Complete your verification to start investing
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
      {tab === "overview" && (
        <>
          <div style={{ marginBottom: "32px" }}>
            <h1
              style={{
                fontSize: "26px",
                fontWeight: 700,
                marginBottom: "4px",
                fontFamily: "var(--font-heading)",
              }}
            >
              Good {getGreeting()}, {user?.name?.split(" ")[0]}!
            </h1>
            <p
              style={{ color: "var(--color-text-secondary)", fontSize: "14px" }}
            >
              Here's how your agricultural portfolio is doing.
            </p>
          </div>
          <div className="metric-cards">
            <div className="metric-card">
              <div className="metric-card-label">Total Invested</div>
              <div className="metric-card-value text-mono">
                ₦{totalInvested.toLocaleString()}
              </div>
            </div>
            <div className="metric-card">
              <div className="metric-card-label">Total Expected Profit</div>
              <div className="metric-card-value gold text-mono">
                ₦{totalExpectedProfit.toLocaleString()}
              </div>
            </div>
            <div className="metric-card">
              <div className="metric-card-label">Total Expected Payout</div>
              <div className="metric-card-value text-mono">
                ₦{totalExpectedPayout.toLocaleString()}
              </div>
            </div>
            <div className="metric-card">
              <div className="metric-card-label">Received to Date</div>
              <div className="metric-card-value green text-mono">
                ₦{receivedToDate.toLocaleString()}
              </div>
            </div>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "16px",
            }}
          >
            <h2 style={{ fontSize: "18px", fontWeight: 600 }}>
              Your Investments
            </h2>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                className={`btn btn-${viewMode === "table" ? "solid" : "ghost"} btn-sm`}
                onClick={() => setViewMode("table")}
              >
                Table
              </button>
              <button
                className={`btn btn-${viewMode === "card" ? "solid" : "ghost"} btn-sm`}
                onClick={() => setViewMode("card")}
              >
                Cards
              </button>
            </div>
          </div>
          <InvestmentsView investments={displayPortfolio} mode={viewMode} />
        </>
      )}
      {tab === "investments" && (
        <>
          <h1
            style={{
              fontSize: "26px",
              fontWeight: 700,
              marginBottom: "24px",
              fontFamily: "var(--font-heading)",
            }}
          >
            My Investments
          </h1>
          <InvestmentsView investments={displayPortfolio} mode={viewMode} />
        </>
      )}
      {tab === "returns" && (
        <>
          <h1
            style={{
              fontSize: "26px",
              fontWeight: 700,
              marginBottom: "24px",
              fontFamily: "var(--font-heading)",
            }}
          >
            Returns
          </h1>
          <div
            style={{ display: "flex", flexDirection: "column", gap: "16px" }}
          >
            {displayPortfolio.map((inv) => (
              <div key={inv.id} className="card" style={{ padding: "24px" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: "16px",
                  }}
                >
                  <div>
                    <h3 style={{ fontWeight: 600 }}>{inv.farmName}</h3>
                    <p
                      style={{
                        fontSize: "13px",
                        color: "var(--color-text-secondary)",
                      }}
                    >
                      {inv.crop}
                    </p>
                  </div>
                  <span className="badge badge-pending">Pending</span>
                </div>
                <div style={{ display: "flex", gap: "40px", flexWrap: "wrap" }}>
                  <div>
                    <div
                      className="text-mono"
                      style={{
                        fontSize: "13px",
                        color: "var(--color-text-secondary)",
                      }}
                    >
                      Invested
                    </div>
                    <div
                      className="text-mono"
                      style={{ fontSize: "20px", fontWeight: 700 }}
                    >
                      ₦{inv.amount.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div
                      className="text-mono"
                      style={{
                        fontSize: "13px",
                        color: "var(--color-text-secondary)",
                      }}
                    >
                      Expected
                    </div>
                    <div
                      className="text-mono"
                      style={{
                        fontSize: "20px",
                        fontWeight: 700,
                        color: "var(--color-primary)",
                      }}
                    >
                      ₦{inv.expected_return.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div
                      className="text-mono"
                      style={{
                        fontSize: "13px",
                        color: "var(--color-text-secondary)",
                      }}
                    >
                      Uplift
                    </div>
                    <div
                      className="text-mono"
                      style={{
                        fontSize: "20px",
                        fontWeight: 700,
                        color: "var(--color-accent)",
                      }}
                    >
                      +
                      {(
                        ((inv.expected_return - inv.amount) / inv.amount) *
                        100
                      ).toFixed(1)}
                      %
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
      {tab === "payouts" && (
        <>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              marginBottom: "24px",
              flexWrap: "wrap",
              gap: "16px",
            }}
          >
            <h1
              style={{
                fontSize: "26px",
                fontWeight: 700,
                fontFamily: "var(--font-heading)",
              }}
            >
              Expected Payouts
            </h1>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                className={`btn btn-${payoutsViewMode === "timeline" ? "solid" : "ghost"} btn-sm`}
                onClick={() => setPayoutsViewMode("timeline")}
              >
                Timeline View
              </button>
              <button
                className={`btn btn-${payoutsViewMode === "table" ? "solid" : "ghost"} btn-sm`}
                onClick={() => setPayoutsViewMode("table")}
              >
                Table View
              </button>
            </div>
          </div>

          <div
            className="metric-cards"
            style={{
              gridTemplateColumns: "repeat(3, 1fr)",
              marginBottom: "32px",
            }}
          >
            <div className="metric-card">
              <div className="metric-card-label">Total Expected</div>
              <div className="metric-card-value text-mono">
                ₦{totalExpectedDisplay.toLocaleString()}
              </div>
              <div
                style={{
                  fontSize: "12px",
                  color: "var(--color-text-secondary)",
                  marginTop: "4px",
                }}
              >
                (across {activeFarmsCount} farms)
              </div>
            </div>
            <div
              className="metric-card"
              style={{ borderColor: "var(--color-accent)" }}
            >
              <div
                className="metric-card-label"
                style={{ color: "var(--color-accent)" }}
              >
                In Transit
              </div>
              <div
                className="metric-card-value text-mono"
                style={{ color: "var(--color-accent)" }}
              >
                ₦{inTransitDisplay.toLocaleString()}
              </div>
              <div
                style={{
                  fontSize: "12px",
                  color: "var(--color-text-secondary)",
                  marginTop: "4px",
                }}
              >
                (proceeds confirmed)
              </div>
            </div>
            <div
              className="metric-card"
              style={{ borderColor: "var(--color-primary)" }}
            >
              <div
                className="metric-card-label"
                style={{ color: "var(--color-primary)" }}
              >
                Received to Date
              </div>
              <div
                className="metric-card-value text-mono"
                style={{ color: "var(--color-primary)" }}
              >
                ₦{receivedDisplay.toLocaleString()}
              </div>
              <div
                style={{
                  fontSize: "12px",
                  color: "var(--color-text-secondary)",
                  marginTop: "4px",
                }}
              >
                ({historicPayoutsCount} payout
                {historicPayoutsCount === 1 ? "" : "s"})
              </div>
            </div>
          </div>

          {!detailsSaved && (
            <div
              style={{
                backgroundColor: "#fef5e7",
                borderLeft: "4px solid var(--color-accent)",
                padding: "16px 20px",
                borderRadius: "4px",
                marginBottom: "24px",
                display: "flex",
                gap: "12px",
                alignItems: "center",
              }}
            >
              <span style={{ fontSize: "20px" }}>⚠️</span>
              <div>
                <strong>Add your payout details</strong>
                <p style={{ fontSize: "14px", margin: "4px 0 0 0" }}>
                  Where should we send your returns when your farms complete?
                  Account name must match your BVN in production.{" "}
                  <button
                    className="btn-link"
                    onClick={() => handleTabChange("settings")}
                    style={{ fontWeight: 600 }}
                  >
                    Update now →
                  </button>
                </p>
              </div>
            </div>
          )}

          {payoutsViewMode === "timeline" && (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "20px" }}
            >
              {paginatedPayouts.map((ep) => (
                <div key={ep.id} style={{ display: "flex", gap: "16px" }}>
                  {/* Date Block */}
                  <div
                    style={{
                      width: "80px",
                      textAlign: "center",
                      flexShrink: 0,
                      color:
                        ep.dateStatus === "imminent"
                          ? "var(--color-accent)"
                          : ep.dateStatus === "overdue"
                            ? "var(--color-danger)"
                            : "var(--color-text-secondary)",
                    }}
                  >
                    <div
                      style={{
                        textTransform: "uppercase",
                        fontSize: "13px",
                        fontWeight: 600,
                      }}
                    >
                      {new Date(ep.expectedDate).toLocaleString("default", {
                        month: "short",
                      })}
                    </div>
                    <div
                      style={{
                        fontSize: "32px",
                        fontWeight: 700,
                        lineHeight: 1,
                        margin: "4px 0",
                      }}
                    >
                      {new Date(ep.expectedDate).getDate()}
                    </div>
                    <div style={{ fontSize: "12px" }}>
                      {new Date(ep.expectedDate).getFullYear()}
                    </div>
                  </div>

                  {/* Payout Card */}
                  <div
                    className="card"
                    style={{
                      flex: 1,
                      padding: "24px",
                      backgroundColor:
                        ep.dateStatus === "overdue"
                          ? "#FBEAE7"
                          : "var(--color-card)",
                      borderColor:
                        ep.dateStatus === "overdue"
                          ? "rgba(181, 74, 47, 0.3)"
                          : "var(--color-border)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        marginBottom: "8px",
                      }}
                    >
                      <div style={{ fontWeight: 600, fontSize: "16px" }}>
                        {ep.farmName}{" "}
                        <span
                          className="badge badge-active"
                          style={{ marginLeft: "8px" }}
                        >
                          {ep.crop}
                        </span>
                      </div>
                      {ep.statusStep === 5 && (
                        <Link to={`/receipts/${ep.id}`} className="btn-link">
                          View Receipt
                        </Link>
                      )}
                    </div>

                    <div style={{ marginBottom: "20px" }}>
                      <div
                        style={{
                          fontSize: "13px",
                          color: "var(--color-text-secondary)",
                        }}
                      >
                        You invested:
                      </div>
                      <div>
                        <strong className="text-mono">
                          ₦{(ep.investedAmount || 0).toLocaleString()}
                        </strong>
                      </div>
                      <div style={{ height: "8px" }} />
                      <div
                        style={{
                          fontSize: "13px",
                          color: "var(--color-text-secondary)",
                        }}
                      >
                        Expected profit:
                      </div>
                      <div>
                        <strong
                          className="text-mono"
                          style={{ color: "var(--color-primary)" }}
                        >
                          ₦
                          {(
                            (ep.expected || 0) - (ep.investedAmount || 0) || 0
                          ).toLocaleString()}
                        </strong>
                      </div>
                      <div style={{ height: "8px" }} />
                      <div
                        style={{
                          fontSize: "13px",
                          color: "var(--color-text-secondary)",
                        }}
                      >
                        Total payout:
                      </div>
                      <div>
                        <strong
                          className="text-mono"
                          style={{ fontSize: "20px" }}
                        >
                          {(ep.expected || 0).toLocaleString()}
                        </strong>
                      </div>
                      <div style={{ height: "8px" }} />
                      <div
                        style={{
                          fontSize: "13px",
                          color: "var(--color-text-secondary)",
                        }}
                      >
                        Return rate:
                      </div>
                      <div>
                        <strong
                          className="text-mono"
                          style={{ color: "var(--color-accent)" }}
                        >
                          {(
                            (((ep.expected_payout || 0) - (ep.invested_amount || 0)) /
                              (ep.invested_amount || 1)) *
                            100
                          ).toFixed(1)}
                          %
                        </strong>
                      </div>
                    </div>

                    {/* Pipeline */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        marginBottom: "12px",
                      }}
                    >
                      {[
                        "Invested",
                        "Milestones Done",
                        "Harvest Collected",
                        "Proceeds In",
                        "Payout Sent",
                      ].map((step, idx) => {
                        const isCompleted = idx < ep.statusStep - 1;
                        const isCurrent = idx === ep.statusStep - 1;
                        return (
                          <div
                            key={step}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              flex: idx < 4 ? 1 : "none",
                            }}
                          >
                            <div
                              style={{
                                width: "24px",
                                height: "24px",
                                borderRadius: "50%",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "10px",
                                backgroundColor:
                                  ep.status === "Failed"
                                    ? "var(--color-danger)"
                                    : isCompleted
                                      ? "var(--color-primary)"
                                      : isCurrent
                                        ? "var(--color-accent)"
                                        : "var(--color-card-alt)",
                                color:
                                  isCompleted ||
                                  isCurrent ||
                                  ep.status === "Failed"
                                    ? "#fff"
                                    : "var(--color-text-secondary)",
                              }}
                            >
                              {ep.status === "Failed"
                                ? "✕"
                                : isCompleted
                                  ? "✓"
                                  : isCurrent
                                    ? "●"
                                    : "○"}
                            </div>
                            {idx < 4 && (
                              <div
                                style={{
                                  height: "2px",
                                  flex: 1,
                                  margin: "0 4px",
                                  backgroundColor: isCompleted
                                    ? "var(--color-primary)"
                                    : "var(--color-card-alt)",
                                }}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Status Context & Links */}
                    <div
                      style={{
                        fontSize: "13px",
                        color: "var(--color-text-secondary)",
                        marginBottom: "16px",
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <span>
                        {ep.status === "Failed" && (
                          <span
                            style={{
                              color: "var(--color-danger)",
                              fontWeight: 500,
                            }}
                          >
                            Transfer Failed: Target bank rejected the account
                            details. Please update your settings.
                          </span>
                        )}
                        {ep.statusStep === 1 && "Investment confirmed — awaiting farm milestones."}
                        {ep.statusStep === 2 &&
                          "All farm milestones verified — harvest expected by " + new Date(ep.expectedDate).toLocaleDateString()}
                        {ep.statusStep === 3 &&
                          "Harvest collected and verified — processing returns."}
                        {ep.statusStep === 4 &&
                          "Proceeds confirmed — payout initiated to your account."}
                        {ep.statusStep === 5 &&
                          `Paid on ${new Date(ep.expectedDate).toLocaleDateString()} — ₦${ep.expected.toLocaleString()}`}
                        {ep.dateStatus === "overdue" && (
                          <span
                            style={{
                              color: "var(--color-danger)",
                              display: "block",
                              marginTop: "4px",
                              fontWeight: 500,
                            }}
                          >
                            Expected by{" "}
                            {new Date(ep.expectedDate).toLocaleDateString()} —
                            currently delayed. AgriFlow is following up.{" "}
                            <button
                              className="btn-link"
                              style={{
                                color: "var(--color-danger)",
                                fontWeight: 600,
                                textDecoration: "underline",
                              }}
                            >
                              Contact Support
                            </button>
                          </span>
                        )}
                      </span>
                    </div>

                    <div style={{ display: "flex", gap: "16px" }}>
                      <Link to={`/farms/${ep.farmId}`} className="btn-link">
                        View Farm
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
              <Pagination
                currentPage={payoutsPage}
                totalPages={Math.ceil(displayPayouts.length / ITEMS_PER_PAGE)}
                onPageChange={setPayoutsPage}
              />
            </div>
          )}

          {payoutsViewMode === "table" && (
            <div style={{ overflowX: "auto" }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Farm</th>
                    <th>Crop</th>
                    <th>Invested</th>
                    <th>Expected Return</th>
                    <th>Return Type</th>
                    <th>Expected Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedPayouts.map((ep) => (
                    <tr
                      key={ep.id}
                      onClick={() => navigate(`/farms/${ep.farmId}`)}
                      style={{ cursor: "pointer" }}
                      className="hover-row"
                    >
                      <td style={{ fontWeight: 500 }}>{ep.farmName}</td>
                      <td>
                        <span className="badge badge-active">{ep.crop}</span>
                      </td>
                      <td className="text-mono">
                        ₦{ep.investedAmount.toLocaleString()}
                      </td>
                      <td
                        className="text-mono"
                        style={{
                          color: "var(--color-primary)",
                          fontWeight: 600,
                        }}
                      >
                        ₦{ep.expected.toLocaleString()}
                      </td>
                      <td style={{ textTransform: "capitalize" }}>
                        Fixed ROI
                      </td>
                      <td
                        style={{
                          fontSize: "13px",
                          color:
                            ep.dateStatus === "overdue"
                              ? "var(--color-danger)"
                              : "var(--color-text-primary)",
                        }}
                      >
                        {new Date(ep.expectedDate).toLocaleDateString()}
                      </td>
                      <td>
                        <span
                          className={
                            ep.status === "Failed"
                              ? "badge badge-danger"
                              : ep.statusStep === 5
                                ? "badge badge-completed"
                                : "badge badge-pending"
                          }
                        >
                          {ep.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <Pagination
                currentPage={payoutsPage}
                totalPages={Math.ceil(displayPayouts.length / ITEMS_PER_PAGE)}
                onPageChange={setPayoutsPage}
              />
            </div>
          )}
        </>
      )}
      {tab === "settings" && (
        <div>
          <h1
            style={{
              fontSize: "26px",
              fontWeight: 700,
              marginBottom: "24px",
              fontFamily: "var(--font-heading)",
            }}
          >
            Settings
          </h1>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "24px",
              alignItems: "flex-start",
            }}
          >
            {/* Account Settings */}
            <div
              className="card"
              style={{ padding: "24px", flex: "1 1 300px", maxWidth: "480px" }}
            >
              <h3 style={{ fontWeight: 600, marginBottom: "16px" }}>
                Account Information
              </h3>
              <div className="form-group" style={{ marginBottom: "16px" }}>
                <label className="form-label">Full Name</label>
                <input className="form-input" defaultValue={user?.name} />
              </div>
              <div className="form-group" style={{ marginBottom: "20px" }}>
                <label className="form-label">Email</label>
                <input className="form-input" defaultValue={user?.email} disabled />
              </div>
              <button className="btn btn-solid">Save Changes</button>
            </div>

            {/* Verification Status */}
            <div
              className="card"
              style={{ padding: "24px", flex: "1 1 300px", maxWidth: "480px" }}
            >
              <h3 style={{ fontWeight: 600, marginBottom: "16px" }}>
                Identity & Verification
              </h3>
              <p style={{ fontSize: "13px", color: "var(--color-text-secondary)", marginBottom: "20px", lineHeight: 1.5 }}>
                Verify your identity to unlock higher investment limits and automated payouts.
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
            </div>

            {/* Payout Details */}
            <div
              className="card"
              style={{ padding: "24px", flex: "1 1 320px", maxWidth: "600px" }}
            >
              <h3 style={{ fontWeight: 600, marginBottom: "12px" }}>
                Payout Details
              </h3>
              <p
                style={{
                  fontSize: "13px",
                  color: "var(--color-text-secondary)",
                  marginBottom: "20px",
                  lineHeight: 1.5,
                }}
              >
                Where should we send your returns when your farms complete?
                Account name must match your BVN in production.
              </p>

              {detailsSaved ? (
                <div
                  style={{
                    padding: "16px",
                    backgroundColor: "var(--color-primary-light)",
                    color: "var(--color-primary-dark)",
                    borderRadius: "8px",
                    marginBottom: "20px",
                    fontSize: "14px",
                    fontWeight: 500,
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                  }}
                >
                  <span style={{ fontSize: "18px" }}>✓</span> Your details are
                  saved. You’ll receive payouts here when your investments
                  complete.
                </div>
              ) : null}

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "16px",
                  marginBottom: "16px",
                }}
              >
                <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                  <label className="form-label">
                    Account Name (Must match BVN)
                  </label>
                  <input
                    className="form-input"
                    value={payoutDetails.accountName}
                    onChange={(e) =>
                      setPayoutDetails({
                        ...payoutDetails,
                        accountName: e.target.value,
                      })
                    }
                    placeholder="e.g. Chukwuemeka Obi"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Bank Name</label>
                  <select
                    className="form-select form-input"
                    value={payoutDetails.bankName}
                    onChange={(e) =>
                      setPayoutDetails({
                        ...payoutDetails,
                        bankName: e.target.value,
                      })
                    }
                  >
                    <option value="">Select Bank...</option>
                    <option value="GTBank">GTBank</option>
                    <option value="First Bank">First Bank</option>
                    <option value="Zenith Bank">Zenith Bank</option>
                    <option value="Access Bank">Access Bank</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Account Number</label>
                  <input
                    className="form-input text-mono"
                    maxLength={10}
                    value={payoutDetails.accountNumber}
                    onChange={(e) =>
                      setPayoutDetails({
                        ...payoutDetails,
                        accountNumber: e.target.value,
                      })
                    }
                    placeholder="0123456789"
                  />
                </div>
              </div>

              <button
                className="btn btn-solid"
                style={{ width: "100%" }}
                onClick={() => setDetailsSaved(true)}
                disabled={
                  detailsSaved ||
                  (!payoutDetails.accountName && !payoutDetails.accountNumber)
                }
              >
                Save Payout Details
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
    <KYCModal isOpen={isKycOpen} onClose={() => setIsKycOpen(false)} role="investor" />
    </>
  );
}

function InvestmentsView({ investments, mode }) {
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 6;
  useEffect(() => setCurrentPage(1), [mode]);

  const pbStart = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginated = investments.slice(pbStart, pbStart + ITEMS_PER_PAGE);

  if (investments.length === 0)
    return (
      <EmptyState
        title="No investments yet"
        description="You haven't invested yet. Browse farms →"
        action={() => (window.location.href = "/farms")}
        actionLabel="Browse Farms"
      />
    );

  if (mode === "card") {
    return (
      <>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: "16px",
          }}
        >
          {paginated.map((inv) => (
            <div key={inv.id} className="card" style={{ padding: "20px" }}>
              <div style={{ marginBottom: "12px" }}>
                <h3 style={{ fontWeight: 600, fontSize: "16px" }}>
                  {inv.farmName}
                </h3>
                <span
                  className="badge badge-active"
                  style={{ marginTop: "4px" }}
                >
                  {inv.crop}
                </span>
              </div>
              <div
                style={{
                  fontSize: "13px",
                  color: "var(--color-text-secondary)",
                  marginBottom: "12px",
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "8px",
                }}
              >
                <div>
                  <span style={{ color: "var(--color-text-secondary)" }}>
                    Invested:
                  </span>
                  <div>
                    <strong className="text-mono">
                      ₦{inv.amount.toLocaleString()}
                    </strong>
                  </div>
                </div>
                <div>
                  <span style={{ color: "var(--color-text-secondary)" }}>
                    Profit:
                  </span>
                  <div>
                    <strong
                      className="text-mono"
                      style={{ color: "var(--color-primary)" }}
                    >
                      ₦
                      {(
                        (inv.expected_return || 0) - (inv.amount || 0)
                      ).toLocaleString()}
                    </strong>
                  </div>
                </div>
                <div>
                  <span style={{ color: "var(--color-text-secondary)" }}>
                    Total Payout:
                  </span>
                  <div>
                    <strong className="text-mono">
                      ₦{(inv.expected_return || 0).toLocaleString()}
                    </strong>
                  </div>
                </div>
                <div>
                  <span style={{ color: "var(--color-text-secondary)" }}>
                    Rate:
                  </span>
                  <div>
                    <strong
                      className="text-mono"
                      style={{ color: "var(--color-accent)" }}
                    >
                      {(
                        (((inv.expected_return || 0) - (inv.amount || 0)) /
                          inv.amount) *
                        100
                      ).toFixed(1)}
                      %
                    </strong>
                  </div>
                </div>
              </div>
              <div className="progress-track" style={{ marginBottom: "6px" }}>
                <div
                  className="progress-fill"
                  style={{
                    width: `${(inv.milestonesCurrent / inv.milestonesTotal) * 100}%`,
                  }}
                />
              </div>
              <div
                style={{
                  fontSize: "12px",
                  color: "var(--color-text-secondary)",
                }}
              >
                {inv.milestonesCurrent} of {inv.milestonesTotal} milestones
              </div>
              <Link
                to={`/farms/${inv.farmId}`}
                className="btn-link"
                style={{ marginTop: "12px", display: "block" }}
              >
                View Farm →
              </Link>
            </div>
          ))}
        </div>
        <Pagination
          currentPage={currentPage}
          totalPages={Math.ceil(investments.length / ITEMS_PER_PAGE)}
          onPageChange={setCurrentPage}
        />
      </>
    );
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table className="data-table">
        <thead>
          <tr>
            <th>Farm Name</th>
            <th>Crop</th>
            <th>Invested</th>
            <th>Return Type</th>
            <th>Milestones</th>
            <th>Expected Return</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {paginated.map((inv) => (
            <tr key={inv.id}>
              <td style={{ fontWeight: 500 }}>{inv.farmName}</td>
              <td>
                <span className="badge badge-active">{inv.crop}</span>
              </td>
              <td className="text-mono">₦{inv.amount.toLocaleString()}</td>
              <td style={{ textTransform: "capitalize" }}>
                {inv.dividendType}
              </td>
              <td>
                <div
                  style={{ display: "flex", alignItems: "center", gap: "8px" }}
                >
                  <div className="progress-track" style={{ width: "60px" }}>
                    <div
                      className="progress-fill"
                      style={{
                        width: `${(inv.milestonesCurrent / inv.milestonesTotal) * 100}%`,
                      }}
                    />
                  </div>
                  <span
                    style={{
                      fontSize: "12px",
                      color: "var(--color-text-secondary)",
                    }}
                  >
                    {inv.milestonesCurrent}/{inv.milestonesTotal}
                  </span>
                </div>
              </td>
              <td
                className="text-mono"
                style={{ color: "var(--color-primary)" }}
              >
                ₦{inv.expected_return.toLocaleString()}
              </td>
              <td>
                <Link to={`/farms/${inv.farmId}`} className="btn-link">
                  View Farm
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <Pagination
        currentPage={currentPage}
        totalPages={Math.ceil(investments.length / ITEMS_PER_PAGE)}
        onPageChange={setCurrentPage}
      />
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}
