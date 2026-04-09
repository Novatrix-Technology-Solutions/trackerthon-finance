import React from 'react';
import { X, LayoutDashboard, ScrollText, Calendar, CreditCard, DownloadCloud } from 'lucide-react';

export default function HelpGuideModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-gray-900" onClick={onClose} />
      
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col z-[10000]" style={{ backgroundColor: '#ffffff', opacity: 1 }}>
        
        <div className="flex items-center justify-between px-8 py-5 border-b border-gray-100" style={{ backgroundColor: '#f9fafb' }}>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">Application Guide</h2>
          <button 
            onClick={onClose}
            className="p-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Area */}
        <div className="overflow-y-auto px-8 py-6 space-y-8 bg-white h-full" style={{ backgroundColor: '#ffffff' }}>
          
          <div className="bg-money-green/10 text-money-dark p-4 rounded-xl border border-money-light/30">
            <strong>Welcome to Trackerthon Finance!</strong> This intelligent dashboard acts as your cloud-native financial engine. Below is a detailed breakdown of how to fully utilize the core modules natively built into your workflow.
          </div>

          {/* Section 1 */}
          <div className="flex gap-4">
            <div className="flex-shrink-0 p-3 bg-money-light/20 text-money-green rounded-xl h-fit">
              <LayoutDashboard className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">1. The Dashboard Snapshot</h3>
              <p className="text-gray-600 leading-relaxed mb-3">
                The core Dashboard synthesizes all your data into organic snapshots. The primary metrics automatically evaluate your net profit and cash flow dynamics relative to actual calendar trends extracted straight from your datastore.
              </p>
              <ul className="list-disc pl-5 text-gray-600 space-y-1">
                <li><strong>Interactive Visualization:</strong> Hover over the Area Chart to isolate exact month-over-month profit margins.</li>
                <li><strong>Generate Reports:</strong> Hit the <strong>"PDF Report"</strong> button to immediately download a consolidated text matrix. Perfect for tax auditing or rapid investor overviews.</li>
              </ul>
            </div>
          </div>

          {/* Section 2 */}
          <div className="flex gap-4 border-t border-gray-100 pt-8">
            <div className="flex-shrink-0 p-3 bg-money-light/20 text-money-green rounded-xl h-fit">
              <ScrollText className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">2. Operating the Ledger</h3>
              <p className="text-gray-600 leading-relaxed mb-3">
                The Ledger drives the atomic data points configuring your Dashboard. It tracks explicit money-in and money-out transactions.
              </p>
              <ul className="list-disc pl-5 text-gray-600 space-y-1">
                <li><strong>Cloud Architecture:</strong> Logging a new timeline transaction strictly binds it to your persistent Supabase tables cleanly.</li>
                <li><strong><DownloadCloud className="w-4 h-4 inline mr-1" />Automated Sheets Integration:</strong> The absolute magic is the background sync hook! Saving an income/expense parameter automatically routes structurally parsed data directly to your authorized Google Spreadsheet URI autonomously.</li>
                <li><em>Tip:</em> To gracefully modify bad inputs, hover quietly over existing line rows to reveal interactive Edit/Delete controls tucked on the right edge.</li>
              </ul>
            </div>
          </div>

          {/* Section 3 */}
          <div className="flex gap-4 border-t border-gray-100 pt-8">
            <div className="flex-shrink-0 p-3 bg-money-light/20 text-money-green rounded-xl h-fit">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">3. Subscription Automation</h3>
              <p className="text-gray-600 leading-relaxed mb-3">
                Manage automated SaaS or "set-and-forget" payments dynamically using the Recurring Module. This actively estimates massive cumulative annual leakages if left unchecked.
              </p>
              <ul className="list-disc pl-5 text-gray-600 space-y-1">
                <li><strong>Frequency Engines:</strong> Whether marking transactions as `Weekly` or `Monthly`, the framework calculates total average estimated outflow context.</li>
                <li><strong>Google Calendar Infinite Sync rules:</strong> Subscriptions aren't just recorded—they're pushed. Generating an item configures a secure `RRULE` (Recurrence Rule) payload natively inside your synced Google Calendar account, meaning those events will repeat on your personal calendar flawlessly. Look for the blue icon!</li>
              </ul>
            </div>
          </div>

          {/* Section 4 */}
          <div className="flex gap-4 border-t border-gray-100 pt-8">
            <div className="flex-shrink-0 p-3 bg-money-light/20 text-money-green rounded-xl h-fit">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">4. Liabilities tracker</h3>
              <p className="text-gray-600 leading-relaxed mb-3">
                Debts track heavy structural principal, visually monitoring repayment completion phases across 100% cap bars.
              </p>
              <ul className="list-disc pl-5 text-gray-600 space-y-1">
                <li><strong>Warning Engine:</strong> Progress bars monitor remaining debt automatically reflecting edited inputs.</li>
                <li><strong>Event Booking:</strong> Due dates act functionally identical to subscriptions. Formulating a debt intelligently schedules a singular reminder tag into the authorized Google calendar system block precisely on that explicit day.</li>
                <li><em>Critical Parity Note:</em> Never delete event hooks exclusively from Google blindly! Simply click the `Trash` button on Trackerthon interfaces and it organically pings Google to sever it securely!</li>
              </ul>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
