// NC Zoning Academy: hosting runtime config.
//
// This is the HOSTED profile: live labs on, localStorage persistence on.
// Claude Design's PREVIEW must override all three (liveMode:false, persist:false,
// and render the inlined SAMPLE_COURSE) so the sandbox never fetches or writes
// storage. The shell reads window.ACADEMY_CONFIG; nothing else configures it.
window.ACADEMY_CONFIG = {
  liveMode: true,                      // hosted: real API fetches allowed (labs go live)
  apiBase: "https://api.nczoning.net", // Data API base; labs respect the 100 req / 10s / IP cap
  persist: true,                       // hosted: progress in localStorage under ncza:v1:*
  course: "data-api"                   // default course id (public/courses/<id>.json)
};
