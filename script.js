// ----------------- Supabase Config -----------------
const SUPABASE_URL = "https://ldtomlnitalgcubjfatc.supabase.co"; // عدّلها إذا لزم
const SUPABASE_KEY = "PUT_YOUR_PUBLISHABLE_KEY_HERE";            // حط الـ publishable key هون

// supabase global object جاي من سكربت CDN
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

console.log("Supabase client created");

// Helper لعرض الرسائل
function setStatus(elementId, message, type = "info") {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.textContent = message || "";
  el.classList.remove("status-ok", "status-error");
  if (type === "ok") el.classList.add("status-ok");
  if (type === "error") el.classList.add("status-error");
}

// نضمن إن الكود ما يشتغل إلا بعد تحميل الصفحة
document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM loaded");

  const form = document.getElementById("invoiceForm");
  if (form) {
    console.log("Invoice form found, attaching submit handler");
    form.addEventListener("submit", handleInvoiceSubmit);
  }

  // لو صفحة أدمن، هون بيكمّل
  loadAdminTable();
});

// ----------------- Submit Invoice (index.html) -----------------
async function handleInvoiceSubmit(e) {
  e.preventDefault();

  const submitBtn = document.getElementById("submitBtn");
  const full_name = document.getElementById("full_name").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const invoice_id = document.getElementById("invoice_id").value.trim();
  const imageInput = document.getElementById("image");
  const imageFile = imageInput.files[0];

  if (!imageFile) {
    setStatus("status", "Please upload an invoice image.", "error");
    return;
  }

  try {
    submitBtn.disabled = true;
    setStatus("status", "Uploading image...", "info");
    console.log("Starting upload...");

    const fileName = `${Date.now()}_${imageFile.name}`;

    // 1) رفع الصورة على bucket invoice-images
    const { data: uploadData, error: uploadError } = await supabaseClient
      .storage
      .from("invoice-images")
      .upload(fileName, imageFile);

    if (uploadError) {
      console.error("Upload error:", uploadError);
      setStatus("status", "Upload error: " + uploadError.message, "error");
      submitBtn.disabled = false;
      return;
    }

    console.log("Upload success:", uploadData);

    // 2) جلب الرابط العلني للصورة
    const { data: publicData } = supabaseClient
      .storage
      .from("invoice-images")
      .getPublicUrl(fileName);

    const imageUrl = publicData.publicUrl;
    console.log("Public URL:", imageUrl);

    // 3) إدخال الصف في جدول invoices
    setStatus("status", "Saving invoice data...", "info");

    const { data, error } = await supabaseClient
      .from("invoices")
      .insert([
        {
          full_name,
          phone,
          invoice_id,
          image_url: imageUrl,
          status: "pending",
        }
      ])
      .select();

    if (error) {
      console.error("DB insert error:", error);
      setStatus("status", "Database error: " + error.message, "error");
    } else {
      console.log("Insert success:", data);
      setStatus("status", "Invoice submitted successfully ✔", "ok");
      e.target.reset();
    }
  } catch (err) {
    console.error("Unexpected error:", err);
    setStatus("status", "Unexpected error, please try again later.", "error");
  } finally {
    submitBtn.disabled = false;
  }
}

// ----------------- Admin Page (load data) -----------------
async function loadAdminTable() {
  const tableBody = document.getElementById("invoiceTable");
  if (!tableBody) {
    // مش صفحة الأدمن، طنّش
    return;
  }

  console.log("Loading admin table...");

  try {
    const { data, error } = await supabaseClient
      .from("invoices")
      .select("*")
      .order("id", { ascending: false });

    if (error) {
      console.error("Admin load error:", error);
      setStatus("adminStatus", "Error loading invoices: " + error.message, "error");
      return;
    }

    console.log("Invoices loaded:", data);

    tableBody.innerHTML = "";

    if (!data || data.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="7">No invoices yet.</td>
        </tr>
      `;
      return;
    }

    data.forEach(row => {
      const tr = document.createElement("tr");

      tr.innerHTML = `
        <td>${row.id}</td>
        <td>${row.created_at ? new Date(row.created_at).toLocaleString() : ""}</td>
        <td>${row.full_name ?? ""}</td>
        <td>${row.phone ?? ""}</td>
        <td>${row.invoice_id ?? ""}</td>
        <td>
          ${row.image_url ? `<a href="${row.image_url}" target="_blank">
            <img src="${row.image_url}" class="invoice-image" />
          </a>` : ""}
        </td>
        <td class="status-${row.status}">${row.status}</td>
      `;

      tableBody.appendChild(tr);
    });

    setStatus("adminStatus", "Invoices loaded.", "ok");
  } catch (err) {
    console.error("Admin unexpected error:", err);
    setStatus("adminStatus", "Unexpected error loading invoices.", "error");
  }
}
