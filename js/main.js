// Force a touchstart listener on header links to trigger click responsiveness on touch devices.
document.addEventListener("DOMContentLoaded", () => {
    // Focus the document body to help with mobile click issues.
    document.body.focus();
  
    // Attach a dummy touchstart event to all header links.
    document.querySelectorAll('.header a').forEach(link => {
      link.addEventListener('touchstart', function() {}, { passive: true });
    });
  });
  
  // Scroll to Section
  function scrollToSection(id) {
    document.getElementById(id).scrollIntoView({ behavior: 'smooth' });
  }
  
  // Typewriter Effect
  document.addEventListener('DOMContentLoaded', function() {
    const typewriter = new Typewriter(document.getElementById('typewriter'), { loop: true, delay: 70 });
    typewriter.typeString('Your AI Travel Planner')
      .pauseFor(1200)
      .deleteAll()
      .typeString('Explore with Confidence')
      .pauseFor(1200)
      .deleteAll()
      .typeString('Plan & Price Your Trip')
      .pauseFor(1200)
      .start();
  
    // Initialize AOS (Animate On Scroll)
    AOS.init({
      duration: 800,
      easing: 'ease-in-out',
      once: true
    });
  
    // Initialize Tippy on donation button
    tippy('#donate-btn', {
      content: "Click here to donate via PayPal",
      placement: "top"
    });
  });
  
  // API & Itinerary Planner Functionality
  const API_URL = 'https://gpt-4o-mini.ai.esb.is-a.dev/v1/chat/completions';
  const API_KEY = 'gpt-4o-mini';
  
  async function callChatAPI(messages) {
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`
    };
    const body = { model: 'gpt-4o-mini', messages, stream: false };
    const response = await fetch(API_URL, { method: 'POST', headers, body: JSON.stringify(body) });
    if (!response.ok) throw new Error('Error: ' + response.status + ' ' + response.statusText);
    const data = await response.json();
    return data.choices[0].message.content;
  }
  
  async function generateDetailedItinerary(userInput) {
    const messages = [
      { role: "system", content: "You are an AI itinerary planner. Given the following travel request, generate a detailed itinerary including dates, times, locations, recommended activities, and a price breakdown for the trip." },
      { role: "user", content: userInput }
    ];
    return await callChatAPI(messages);
  }
  
  async function shortenItinerary(detailedItinerary) {
    const messages = [
      { role: "system", content: "You are an AI itinerary planner. Given the following detailed itinerary with price breakdown, shorten it to a concise version with clear, actionable details, timings, and a summarized price breakdown." },
      { role: "user", content: detailedItinerary }
    ];
    return await callChatAPI(messages);
  }
  
  // Function to update the hidden chart with calculated values (for Excel export only)
  function updateChartWithValues(accommodation, transportation, food, activities) {
    const ctx = document.getElementById("priceChart").getContext('2d');
    if (window.priceChartInstance) {
      window.priceChartInstance.destroy();
    }
    window.priceChartInstance = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: ['Accommodation', 'Transportation', 'Food', 'Activities'],
        datasets: [{
          data: [accommodation, transportation, food, activities],
          backgroundColor: ['#168a6f', '#4caf50', '#ff9800', '#f44336']
        }]
      },
      options: {
        responsive: false,
        plugins: {
          legend: { display: false }
        }
      }
    });
  }
  
  document.addEventListener('DOMContentLoaded', function() {
    const generateBtn = document.getElementById('generate-btn');
    const planBox = document.getElementById('plan-box');
    const downloadBtn = document.getElementById('download-btn');
  
    generateBtn.addEventListener('click', async () => {
      const itineraryInput = document.getElementById('itinerary-input').value.trim();
      if (!itineraryInput) {
        Swal.fire({
          icon: 'warning',
          title: 'Oops...',
          text: 'Please enter your travel details!'
        });
        return;
      }
  
      planBox.style.display = 'block';
      planBox.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating concise itinerary with pricing...';
      downloadBtn.style.display = 'none';
  
      try {
        const detailedItinerary = await generateDetailedItinerary(itineraryInput);
        const shortItinerary = await shortenItinerary(detailedItinerary);
        planBox.textContent = "Final Itinerary:\n" + shortItinerary;
        downloadBtn.style.display = 'inline-flex';
        // Do not update or display the chart on the webpage.
      } catch (error) {
        planBox.textContent = "An error occurred: " + error.message;
      }
    });
  });
  
  // Download Excel with Chart using ExcelJS
  async function downloadExcel() {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Itinerary");
  
    // Add itinerary text to worksheet
    const itineraryText = document.getElementById("plan-box").textContent.replace("Final Itinerary:\n", "").trim();
    const lines = itineraryText.split("\n");
    lines.forEach((line, index) => {
      worksheet.getCell(`A${index+1}`).value = line;
    });
  
    // Calculate price breakdown for the pie chart.
    // If the itinerary text contains "Total Price: $<number>", use that; otherwise, use a default value.
    let totalPriceMatch = itineraryText.match(/Total Price:\s*\$?(\d+)/i);
    let totalPrice = totalPriceMatch ? parseInt(totalPriceMatch[1], 10) : 1200;
    let accommodation = Math.round(totalPrice * 0.5);
    let transportation = Math.round(totalPrice * 0.25);
    let food = Math.round(totalPrice * 0.15);
    let activities = totalPrice - accommodation - transportation - food;
  
    // Update hidden chart with calculated values
    updateChartWithValues(accommodation, transportation, food, activities);
  
    // Add a header for the chart section
    const chartRow = lines.length + 2;
    worksheet.getCell(`A${chartRow}`).value = "Price Breakdown Chart:";
  
    // Get the chart image from the hidden canvas
    const chartCanvas = document.getElementById("priceChart");
    const chartImageUrl = chartCanvas.toDataURL("image/png");
  
    // Add the image to the workbook
    const imageId = workbook.addImage({
      base64: chartImageUrl,
      extension: 'png',
    });
  
    worksheet.addImage(imageId, {
      tl: { col: 0, row: chartRow },
      ext: { width: 500, height: 300 }
    });
  
    // Generate Excel file and trigger download
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/octet-stream" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "itinerary_plan.xlsx";
    a.click();
    window.URL.revokeObjectURL(url);
  }
  
  // Donation Function using SweetAlert2
  function donate() {
    Swal.fire({
      title: 'Support Our Work',
      text: "Would you like to donate via PayPal?",
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, donate!',
      cancelButtonText: 'No, thanks'
    }).then((result) => {
      if (result.isConfirmed) {
        window.open("https://paypal.me/anshkabra", "_blank");
      }
    });
  }
  