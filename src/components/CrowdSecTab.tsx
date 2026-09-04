import React, { useState } from 'react';
import { CrowdSecTelemetry } from '../types';
import { ShieldCheck, ShieldAlert, ShieldX, Search, Globe, Eye, Zap, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { formatRelativeTime } from '../utils/formatters';

interface CrowdSecTabProps {
  telemetry: CrowdSecTelemetry;
  lapiEndpoint: string;
}

export const CrowdSecTab: React.FC<CrowdSecTabProps> = ({ telemetry, lapiEndpoint }) => {
  const { metrics, topScenarios, topCountries, activeDecisions, isLive } = telemetry;
  const [filterIp, setFilterIp] = useState('');
  const [checkIpInput, setCheckIpInput] = useState('');
  const [checkResult, setCheckResult] = useState<{ isBanned: boolean; decision?: any } | null>(null);

  const filteredDecisions = (activeDecisions || []).filter(
    (d) =>
      d?.value?.includes(filterIp) ||
      (d?.scenario && d.scenario.toLowerCase().includes(filterIp.toLowerCase())) ||
      (d?.country && d.country.toLowerCase().includes(filterIp.toLowerCase()))
  );

  const handleCheckIp = () => {
    if (!checkIpInput.trim()) return;
    const found = (activeDecisions || []).find((d) => d?.value?.trim() === checkIpInput.trim());
    if (found) {
      setCheckResult({ isBanned: true, decision: found });
    } else {
      setCheckResult({ isBanned: false });
    }
  };

  return (
    <div className="space-y-4 font-mono">
      {/* Header Info */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-[#161B22] border border-[#30363D] p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#0D1117] text-[#F85149] border border-[#30363D]">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-bold uppercase tracking-widest text-white">CROWDSEC THREAT INTELLIGENCE HUD</h2>
              <span className="text-[9px] px-1.5 py-0.2 bg-[#0D1117] text-[#F85149] border border-[#30363D]">
                LAPI & EXPORTER
              </span>
            </div>
            <p className="text-[10px] text-[#8B949E] uppercase tracking-wider">TARGET: {lapiEndpoint} • COLLABORATIVE DEFENSE</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[10px]">
          <span className={`px-2 py-0.5 uppercase font-bold text-white ${
            isLive ? 'bg-[#238636]' : 'bg-[#D29922]'
          }`}>
            {isLive ? '● LIVE CROWDSEC LAPI' : '○ THREAT EMULATOR'}
          </span>
          <span className="text-[#8B949E] bg-[#0D1117] px-2 py-0.5 border border-[#30363D]">
            {metrics.bouncersCount} ACTIVE BOUNCERS
          </span>
        </div>
      </div>

      {/* Threat Counter Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Decisions */}
        <div className="bg-[#161B22] border border-[#30363D] p-4">
          <div className="flex items-center justify-between text-[11px] text-[#8B949E] mb-1">
            <span className="flex items-center gap-1.5 uppercase font-bold">
              <ShieldX className="h-3.5 w-3.5 text-[#F85149]" /> ACTIVE DECISIONS (BANS)
            </span>
            <span className="text-[#F85149] font-bold">LAPI</span>
          </div>
          <div className="text-3xl font-bold text-[#F85149] mt-1">
            {metrics.activeDecisionsCount}
          </div>
          <div className="mt-2 text-[10px] text-[#8B949E] flex justify-between">
            <span>SCOPE: IP & SUBNETS</span>
            <span className="text-[#7EE787]">DROPS ENFORCED</span>
          </div>
        </div>

        {/* Total Alerts */}
        <div className="bg-[#161B22] border border-[#30363D] p-4">
          <div className="flex items-center justify-between text-[11px] text-[#8B949E] mb-1">
            <span className="flex items-center gap-1.5 uppercase font-bold">
              <ShieldAlert className="h-3.5 w-3.5 text-[#D29922]" /> THREAT ALERTS
            </span>
            <span className="text-[#D29922] font-bold">TOTAL</span>
          </div>
          <div className="text-3xl font-bold text-white mt-1">
            {metrics.totalAlertsReceived}
          </div>
          <div className="mt-2 text-[10px] text-[#8B949E] flex justify-between">
            <span>BUCKET OVERFLOWS: {metrics.bucketOverflows}</span>
          </div>
        </div>

        {/* Parsers Hits */}
        <div className="bg-[#161B22] border border-[#30363D] p-4">
          <div className="flex items-center justify-between text-[11px] text-[#8B949E] mb-1">
            <span className="flex items-center gap-1.5 uppercase font-bold">
              <Eye className="h-3.5 w-3.5 text-[#4F9CF9]" /> PARSER LOG LINES
            </span>
            <span className="text-[#4F9CF9] font-bold">SYSLOG</span>
          </div>
          <div className="text-3xl font-bold text-white mt-1">
            {metrics.parsersHits.toLocaleString()}
          </div>
          <div className="mt-2 text-[10px] text-[#8B949E] flex justify-between">
            <span>LAPI QUERIES: {metrics.totalLapiRequests}</span>
          </div>
        </div>

        {/* Active Bouncers */}
        <div className="bg-[#161B22] border border-[#30363D] p-4">
          <div className="flex items-center justify-between text-[11px] text-[#8B949E] mb-1">
            <span className="flex items-center gap-1.5 uppercase font-bold">
              <Zap className="h-3.5 w-3.5 text-[#7EE787]" /> REMEDIATION BOUNCERS
            </span>
            <span className="text-[#7EE787] font-bold">ACTIVE</span>
          </div>
          <div className="text-3xl font-bold text-white mt-1">
            {metrics.bouncersCount}
          </div>
          <div className="mt-2 text-[10px] text-[#8B949E] flex justify-between">
            <span>MIKROTIK / NGINX / IPTABLES</span>
          </div>
        </div>
      </div>

      {/* Top Attack Scenarios & Top Countries Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Attack Scenarios */}
        <div className="bg-[#161B22] border border-[#30363D] p-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-white flex items-center gap-2 mb-3 border-b border-[#30363D] pb-2">
            <AlertTriangle className="h-3.5 w-3.5 text-[#D29922]" />
            TOP TRIGGERED ATTACK SCENARIOS
          </h3>
          <div className="space-y-3">
            {(topScenarios || []).map((sc, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-[#E0E0E0]">{sc.scenario}</span>
                  <span className="text-[#D29922] font-bold">{sc.count} HITS</span>
                </div>
                <div className="w-full bg-[#0D1117] h-1.5">
                  <div
                    className="bg-[#D29922] h-full"
                    style={{ width: `${Math.min(100, (sc.count / (topScenarios?.[0]?.count || 1)) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Attacking Countries */}
        <div className="bg-[#161B22] border border-[#30363D] p-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-white flex items-center gap-2 mb-3 border-b border-[#30363D] pb-2">
            <Globe className="h-3.5 w-3.5 text-[#4F9CF9]" />
            TOP ATTACKING ORIGIN COUNTRIES
          </h3>
          <div className="space-y-3">
            {(topCountries || []).map((c, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-[#E0E0E0] flex items-center gap-2">
                    <span className="px-1.5 py-0.2 bg-[#0D1117] text-[9px] text-[#4F9CF9] border border-[#30363D] font-bold">
                      {c.countryCode}
                    </span>
                    {c.country}
                  </span>
                  <span className="text-[#4F9CF9] font-bold">{c.count} THREATS</span>
                </div>
                <div className="w-full bg-[#0D1117] h-1.5">
                  <div
                    className="bg-[#4F9CF9] h-full"
                    style={{ width: `${Math.min(100, (c.count / (topCountries?.[0]?.count || 1)) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Manual IP Ban Checker Tool */}
      <div className="bg-[#161B22] border border-[#30363D] p-4">
        <h3 className="text-xs font-bold uppercase tracking-widest text-white flex items-center gap-2 mb-1">
          <Search className="h-3.5 w-3.5 text-[#4F9CF9]" />
          QUICK IP MITIGATION CHECKER
        </h3>
        <p className="text-[10px] text-[#8B949E] uppercase tracking-wider mb-3">Check if a specific IP address is currently blocked by CrowdSec LAPI</p>
        <div className="flex gap-2 max-w-xl">
          <input
            type="text"
            placeholder="e.g. 185.220.101.5 or 192.168.1.50"
            value={checkIpInput}
            onChange={(e) => setCheckIpInput(e.target.value)}
            className="flex-1 px-3 py-1.5 bg-[#0D1117] border border-[#30363D] text-[11px] text-white focus:outline-none focus:border-[#4F9CF9]"
          />
          <button
            onClick={handleCheckIp}
            className="px-4 py-1.5 bg-[#238636] hover:bg-[#2ea043] text-white text-[10px] font-bold uppercase tracking-wider transition-all"
          >
            CHECK IP
          </button>
        </div>

        {checkResult && (
          <div className="mt-3">
            {checkResult.isBanned ? (
              <div className="p-2.5 bg-[#0D1117] border border-[#F85149] text-[11px] text-[#F85149] flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-[#F85149]" />
                <span>
                  <strong>IP {checkIpInput} IS BANNED!</strong> Scenario: {checkResult.decision.scenario} (Duration: {checkResult.decision.duration})
                </span>
              </div>
            ) : (
              <div className="p-2.5 bg-[#0D1117] border border-[#7EE787] text-[11px] text-[#7EE787] flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-[#7EE787]" />
                <span>IP {checkIpInput} IS NOT CURRENTLY BLOCKED IN ACTIVE DECISIONS.</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Active Decisions Table */}
      <div className="bg-[#161B22] border border-[#30363D]">
        <div className="p-3 border-b border-[#30363D] flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-white flex items-center gap-2">
              <ShieldX className="h-3.5 w-3.5 text-[#F85149]" />
              ACTIVE LAPI MITIGATION DECISIONS & BANNED IPS
            </h3>
            <p className="text-[10px] text-[#8B949E] uppercase tracking-wider mt-0.5">Live blocked IPs, attack origins, and remaining remediation durations</p>
          </div>
          <div className="relative">
            <Search className="h-3 w-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#8B949E]" />
            <input
              type="text"
              placeholder="Filter banned IP or scenario..."
              value={filterIp}
              onChange={(e) => setFilterIp(e.target.value)}
              className="pl-7 pr-3 py-1 bg-[#0D1117] border border-[#30363D] text-[11px] text-white focus:outline-none focus:border-[#F85149]"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-[11px] text-[#E0E0E0]">
            <thead className="bg-[#0D1117] text-[#8B949E] uppercase text-[10px] tracking-wider border-b border-[#30363D]">
              <tr>
                <th className="px-4 py-2.5">BANNED TARGET (IP)</th>
                <th className="px-4 py-2.5">ACTION</th>
                <th className="px-4 py-2.5">TRIGGER SCENARIO</th>
                <th className="px-4 py-2.5">ORIGIN</th>
                <th className="px-4 py-2.5">COUNTRY</th>
                <th className="px-4 py-2.5">DURATION</th>
                <th className="px-4 py-2.5">CREATED</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#30363D]/60 font-mono">
              {filteredDecisions.map((dec) => (
                <tr key={dec.id} className="hover:bg-[#0D1117]/60 transition-colors">
                  <td className="px-4 py-2.5 font-bold text-[#F85149]">{dec.value}</td>
                  <td className="px-4 py-2.5">
                    <span className="px-1.5 py-0.2 text-[9px] uppercase font-bold bg-[#F85149] text-white">
                      {dec.type}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-[#E0E0E0]">{dec.scenario}</td>
                  <td className="px-4 py-2.5 text-[#8B949E]">{dec.origin}</td>
                  <td className="px-4 py-2.5 text-[#4F9CF9]">{dec.country || 'GLOBAL'}</td>
                  <td className="px-4 py-2.5 text-[#D29922]">{dec.duration}</td>
                  <td className="px-4 py-2.5 text-[#8B949E]">{formatRelativeTime(dec.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

