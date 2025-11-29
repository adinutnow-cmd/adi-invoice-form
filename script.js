// ----------------- Supabase Config -----------------
const SUPABASE_URL = "YOUR_URL"; 
const SUPABASE_KEY = "YOUR_ANON_KEY";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ----------------- Submit Invoice -----------------
const form = document.getElementById("invoiceForm");

if (form) {
    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        let full_name = document.getElementById("full_name").value;
        let phone = document.getElementById("phone").value;
        let invoice_id = document.getElementById("invoice_id").value;
        let imageFile = document.getElementById("image").files[0];

        if (!imageFile) return alert("Please upload an image!");

        // Upload image to bucket
        let fileName = `${Date.now()}_${imageFile.name}`;
        let { data: uploadData, error: uploadError } = await supabaseClient.storage
            .from("invoice-images")
            .upload(fileName, imageFile);

        if (uploadError) return alert("Upload error: " + uploadError.message);

        // Get public URL
        let { data: publicUrl } = supabaseClient.storage
            .from("invoice-images")
            .getPublicUrl(fileName);

        // Insert into DB
        let { data, error } = await supabaseClient
            .from("invoices")
            .insert({
                full_name,
                phone,
                invoice_id,
                image_url: publicUrl.publicUrl,
                status: "pending"
            });

        if (error) {
            alert("Database error: " + error.message);
        } else {
            document.getElementById("result").innerText = "Invoice Submitted Successfully!";
            form.reset();
        }
    });
}

// ----------------- Admin Page (Load Data) -----------------
async function loadAdminTable() {
    const table = document.getElementById("invoiceTable");
    if (!table) return;

    let { data, error } = await supabaseClient
        .from("invoices")
        .select("*")
        .order("id", { ascending: false });

    if (error) {
        table.innerHTML = "<tr><td colspan='7'>Error loading invoices</td></tr>";
        return;
    }

    table.innerHTML = "";

    data.forEach(row => {
        let tr = document.createElement("tr");

        tr.innerHTML = `
            <td>${row.id}</td>
            <td>${row.created_at ?? ""}</td>
            <td>${row.full_name}</td>
            <td>${row.phone}</td>
            <td>${row.invoice_id}</td>
            <td><img src="${row.image_url}" class="invoice-image"></td>
            <td class="status-${row.status}">${row.status}</td>
        `;

        table.appendChild(tr);
    });
}

loadAdminTable();
