/**
 * Run this function in the Google Apps Script editor to verify that the script
 * can open the target Google Form and validate all 31 Brighton units and 9 tasks.
 */
function diagnoseWebsiteIntegration() {
  const report = {
    checkedAt: new Date().toISOString(),
    timeZone: Session.getScriptTimeZone(),
    formIdConfigured: Boolean(PropertiesService.getScriptProperties().getProperty('FORM_ID')),
    steps: []
  };

  function step(name, fn) {
    try {
      const detail = fn();
      report.steps.push({ step: name, ok: true, detail: detail || 'OK' });
    } catch (error) {
      report.steps.push({
        step: name,
        ok: false,
        code: error && error.code ? error.code : null,
        message: error && error.message ? error.message : String(error)
      });
    }
  }

  step('checkTimeZone', function () {
    if (Session.getScriptTimeZone() !== 'Asia/Jakarta') {
      throw new Error('Set timeZone ke Asia/Jakarta di Project Settings.');
    }
    return 'Asia/Jakarta';
  });

  step('openForm', function () {
    const form = openForm_();
    return {
      title: form.getTitle(),
      acceptingResponses: form.isAcceptingResponses(),
      itemCount: form.getItems().length
    };
  });

  step('validateSetup', function () {
    validateSetup();
    return 'Semua 31 unit dan 9 layanan cocok dengan item Google Form.';
  });

  console.log(JSON.stringify(report, null, 2));
  return report;
}
