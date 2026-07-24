import React from 'react'

type P = { size?: number; className?: string }

function icon(path: React.ReactNode) {
  return function Icon({ size = 18, className }: P) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
      >
        {path}
      </svg>
    )
  }
}

export const IHome = icon(<><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /><path d="M10 21v-6h4v6" /></>)
export const IPatients = icon(<><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c.8-3.5 3.4-5.5 6.5-5.5s5.7 2 6.5 5.5" /><circle cx="17" cy="9" r="2.5" /><path d="M16.5 14.6c2.4.3 4.3 1.9 5 4.4" /></>)
export const ICalendar = icon(<><rect x="3.5" y="5" width="17" height="16" rx="2.5" /><path d="M3.5 10h17" /><path d="M8 2.8V6.5M16 2.8V6.5" /></>)
export const IRx = icon(<><path d="M6 3.5h6a4 4 0 0 1 0 8H6z" /><path d="M6 3.5V20" /><path d="m11 11.5 8 8.5" /><path d="m19 13-6.5 7" /></>)
export const IBill = icon(<><path d="M6 2.8h12v18.4l-2.5-1.6-2 1.6-1.5-1.6-1.5 1.6-2-1.6L6 21.2z" /><path d="M9.5 8h5M9.5 12h5" /></>)
export const IReports = icon(<><path d="M4 20.5h16" /><path d="M6.5 20.5v-7M11 20.5V6.5M15.5 20.5V10M20 20.5V4" /></>)
export const ISettings = icon(<><circle cx="12" cy="12" r="3.2" /><path d="M19.4 15a1.6 1.6 0 0 0 .32 1.77l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.6 1.6 0 0 0-1.77-.32 1.6 1.6 0 0 0-1 1.47V21a2 2 0 1 1-4 0v-.09a1.6 1.6 0 0 0-1-1.47 1.6 1.6 0 0 0-1.77.32l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.6 1.6 0 0 0 .32-1.77 1.6 1.6 0 0 0-1.47-1H3a2 2 0 1 1 0-4h.09a1.6 1.6 0 0 0 1.47-1 1.6 1.6 0 0 0-.32-1.77l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.6 1.6 0 0 0 1.77.32h.01a1.6 1.6 0 0 0 1-1.47V3a2 2 0 1 1 4 0v.09a1.6 1.6 0 0 0 1 1.47 1.6 1.6 0 0 0 1.77-.32l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.6 1.6 0 0 0-.32 1.77v.01a1.6 1.6 0 0 0 1.47 1H21a2 2 0 1 1 0 4h-.09a1.6 1.6 0 0 0-1.47 1z" /></>)
export const IPill = icon(<><rect x="3" y="8.5" width="18" height="7" rx="3.5" transform="rotate(-45 12 12)" /><path d="m8.5 8.5 7 7" /></>)
export const ISearch = icon(<><circle cx="11" cy="11" r="7" /><path d="m20.5 20.5-4.5-4.5" /></>)
export const IBell = icon(<><path d="M18 8.5a6 6 0 1 0-12 0c0 6-2.5 7.5-2.5 7.5h17S18 14.5 18 8.5" /><path d="M10.3 20a2 2 0 0 0 3.4 0" /></>)
export const IPlus = icon(<><path d="M12 5v14M5 12h14" /></>)
export const IPrint = icon(<><path d="M6.5 7.5V3h11v4.5" /><rect x="3" y="7.5" width="18" height="9" rx="2" /><path d="M6.5 13.5h11V21h-11z" /></>)
export const IEdit = icon(<><path d="M17 3.5a2.1 2.1 0 0 1 3 3L8.5 18l-4.2 1.2L5.5 15z" /></>)
export const ITrash = icon(<><path d="M4 6.5h16" /><path d="M9 6.5V4.2A1.2 1.2 0 0 1 10.2 3h3.6A1.2 1.2 0 0 1 15 4.2v2.3" /><path d="M6 6.5 7 21h10l1-14.5" /><path d="M10 10.5v6M14 10.5v6" /></>)
export const IEye = icon(<><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12" /><circle cx="12" cy="12" r="3" /></>)
export const IBack = icon(<><path d="M19 12H5" /><path d="m11 6-6 6 6 6" /></>)
export const IMoney = icon(<><circle cx="12" cy="12" r="9" /><path d="M14.8 8.8c-.5-.9-1.6-1.4-2.8-1.4-1.7 0-3 1-3 2.3s1.3 2 3 2.3 3 1 3 2.3-1.3 2.3-3 2.3c-1.2 0-2.3-.5-2.8-1.4" /><path d="M12 5.5v13" /></>)
export const IClipboard = icon(<><rect x="5" y="4" width="14" height="17.5" rx="2" /><path d="M9 4a3 3 0 0 1 6 0" /><path d="M8.5 10.5h7M8.5 14h7M8.5 17.5h4" /></>)
export const ICheck = icon(<><path d="m4.5 12.5 5 5 10-11" /></>)
export const IFlask = icon(<><path d="M9.5 3h5" /><path d="M10.5 3v6L4.8 18.6A2 2 0 0 0 6.6 21.5h10.8a2 2 0 0 0 1.8-2.9L13.5 9V3" /><path d="M7.5 14.5h9" /></>)
export const IHeart = icon(<><path d="M12 20.5S3 15 3 8.9A4.9 4.9 0 0 1 7.9 4c1.8 0 3.3.9 4.1 2.3A4.9 4.9 0 0 1 16.1 4 4.9 4.9 0 0 1 21 8.9c0 6.1-9 11.6-9 11.6" /></>)
export const IVitals = icon(<><path d="M3 12h4l2.5-6 4 12 2.5-6h5" /></>)
export const IDownload = icon(<><path d="M12 3.5v12" /><path d="m7 11 5 5 5-5" /><path d="M4.5 20.5h15" /></>)
export const IFolder = icon(<><path d="M3.5 6.5a2 2 0 0 1 2-2h4l2.5 2.5h6.5a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z" /></>)
export const IRefresh = icon(<><path d="M20.5 11a8.5 8.5 0 1 0-2.3 6.6" /><path d="M20.5 4.5V11H14" /></>)
export const IPhone = icon(<><path d="M6 3.5h3l1.7 4.2-2 1.6a12 12 0 0 0 5.9 5.9l1.7-2 4.2 1.7v3.1a2 2 0 0 1-2.1 2C10.2 19.5 4.5 13.8 4 5.6a2 2 0 0 1 2-2.1" /></>)
export const IUserPlus = icon(<><circle cx="10" cy="8" r="3.5" /><path d="M3.5 20c.8-3.5 3.4-5.5 6.5-5.5s5.7 2 6.5 5.5" /><path d="M18.5 7.5v5M16 10h5" /></>)
export const IClock = icon(<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.5 2" /></>)
export const IAlert = icon(<><path d="M12 3.5 22 20H2z" /><path d="M12 10v4.5" /><path d="M12 17.2v.3" /></>)
export const IMore = icon(<><circle cx="12" cy="5" r="1.4" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" /><circle cx="12" cy="19" r="1.4" fill="currentColor" stroke="none" /></>)
export const ILeafLogo = ({ size = 28 }: P) => (
  <svg width={size} height={size} viewBox="0 0 96 86">
    <path d="M48 12 C40 26 20 28 20 48 a22 22 0 0 0 22 20 h12 a22 22 0 0 0 22 -20 c0-20-20-22-28-36z" fill="#16a34a" />
    <path d="M30 20 C18 16 10 22 8 34 c10 4 20-2 22-14z" fill="#15803d" />
    <path d="M66 20 C78 16 86 22 88 34 c-10 4-20-2-22-14z" fill="#15803d" />
    <path d="M44 30h8v10h10v8H52v10h-8V48H34v-8h10V30z" fill="#fff" />
  </svg>
)
