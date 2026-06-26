document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities", { cache: 'no-store' });
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";
      // Reset activity dropdown before populating to avoid duplicates
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;


        // Build participants list HTML with removable items
        const participantsHtml = details.participants && details.participants.length
          ? `<div class="participants"><strong>Participants:</strong><ul>${details.participants.map(p => `<li class="participant-item"><span class="participant-email">${p}</span><button class="delete-btn" data-activity="${encodeURIComponent(name)}" data-email="${encodeURIComponent(p)}" title="Remove participant">✕</button></li>`).join('')}</ul></div>`
          : `<div class="participants info"><strong>Participants:</strong><p class="muted">No participants yet</p></div>`;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          ${participantsHtml}
        `;

        // Attach delete handlers for this card's buttons
        // Use a small IIFE to capture the activity card scope
        (function attachHandlers(card){
          const buttons = card.querySelectorAll('.delete-btn');
          buttons.forEach(btn => {
            btn.addEventListener('click', async (e) => {
              const email = decodeURIComponent(btn.dataset.email);
              const activityName = decodeURIComponent(btn.dataset.activity);
              btn.disabled = true;
              try {
                const res = await fetch(`/activities/${encodeURIComponent(activityName)}/participants?email=${encodeURIComponent(email)}`, { method: 'DELETE' });
                const data = await res.json();
                if (res.ok) {
                  messageDiv.textContent = data.message;
                  messageDiv.className = 'success';
                  // refresh activities to update UI
                  await fetchActivities();
                } else {
                  messageDiv.textContent = data.detail || 'Failed to remove participant';
                  messageDiv.className = 'error';
                }
              } catch (err) {
                console.error('Error removing participant:', err);
                messageDiv.textContent = 'Failed to remove participant';
                messageDiv.className = 'error';
              } finally {
                messageDiv.classList.remove('hidden');
                setTimeout(() => messageDiv.classList.add('hidden'), 4000);
                btn.disabled = false;
              }
            });
          });
        })(activityCard);

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;
    const submitBtn = signupForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();
        // refresh activities list to show new participant
        await fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
    finally {
      submitBtn.disabled = false;
    }
  });

  // Initialize app
  fetchActivities();
});
