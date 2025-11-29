// script.js
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// 👇 حط القيم تبع مشروعك
const SUPABASE_URL = 'https://xxxxxxxxxx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// اسم جدول الداتا واسم البكت
const TABLE_NAME = 'invoices';
const BUCKET_NAME = 'invoice-images';

document.addEventListener('DOMContentLoaded', () => {
  setupUserForm();   // صفحة index
  setupAdminTable(); // صفحة admin (اللي انت عاملها ومشي حالها)
});

// =======================
// 1) كود صفحة الـ USER (index)
// =======================
function setupUserForm() {
  const form = document.getElementById('invoiceForm');
  if (!form) return; // يعني مش بهالصفحة

  const statusEl = document.getElementById('status');
  const submitBtn = document.getElementById('submitBtn');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    statusEl.textContent = '';
    statusEl.style.color = '#000';

    const fullName = document.getElementById('fullName').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const invoiceId = document.getElementById('invoiceId').value.trim();
    const fileInput = document.getElementById('invoiceImage');
    const file = fileInput.files[0];

    if (!fullName || !phone || !invoiceId || !file) {
      statusEl.textContent = 'Please fill in all fields and select an image.';
      statusEl.style.color = 'red';
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';

    try {
      // 1) check if invoice_id already exists
      const { data: existing, error: dupErr } = await supabase
        .from(TABLE_NAME)
        .select('id')
        .eq('invoice_id', invoiceId)
        .maybeSingle();

      if (dupErr) throw dupErr;

      if (existing) {
        statusEl.textContent = 'This invoice ID has already been submitted.';
        statusEl.style.color = 'red';
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit Invoice';
        return;
      }

      // 2) upload image to bucket
      const ext = file.name.split('.').pop();
      const path = `invoices/${invoiceId}_${Date.now()}.${ext}`;

      const { data: uploadData, error: uploadErr } = await supabase
        .storage
        .from(BUCKET_NAME)
        .upload(path, file);

      if (uploadErr) throw uploadErr;

      // 3) get public URL
      const { data: publicUrlData } = supabase
        .storage
        .from(BUCKET_NAME)
        .getPublicUrl(uploadData.path);

      const imageUrl = publicUrlData.publicUrl;

      // 4) insert row into invoices table
      const { error: insertErr } = await supabase
        .from(TABLE_NAME)
        .insert({
          full_name: fullName,
          phone: phone,
          invoice_id: invoiceId,
          image_url: imageUrl,
          status: 'pending'
        });

      if (insertErr) throw insertErr;

      statusEl.textContent = 'Invoice submitted successfully. Thank you!';
      statusEl.style.color = 'green';
      form.reset();
    } catch (err) {
      console.error(err);
      statusEl.textContent = 'Unexpected error, please try again later.';
      statusEl.style.color = 'red';
    }

    submitBtn.disabled = false;
    submitBtn.textContent = 'Submit Invoice';
  });
}

// =======================
// 2) كود صفحة الـ ADMIN (موجود أصلاً عندك)
// =======================

async function setupAdminTable() {
  const adminTable = document.getElementById('adminTableBody');
  if (!adminTable) return; // يعني مش بصفحة الادمن

  // هون خلي نفس الكود اللي كتبناه قبل لعرض الداتا بالجدول
  // من supabase.from('invoices').select('*').order('created_at', { ascending: false })
}
