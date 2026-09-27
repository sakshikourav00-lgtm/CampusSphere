async function searchColleges() {

    const city = document.getElementById("cityInput").value.trim();
    const collegeList = document.getElementById("collegeList");
    const resultTitle = document.getElementById("resultTitle");
    const suggestions = document.getElementById("suggestions");

    suggestions.innerHTML = "";

    if (city === "") {
        alert("Please enter a city name.");
        return;
    }

    resultTitle.innerText =
        "Searching colleges in " + city + "...";

    collegeList.innerHTML = `
        <div class="loading-card">
            <div class="loader"></div>
            <h3>Finding Colleges...</h3>
            <p>Please wait while we search the city.</p>
        </div>
    `;

    try {

        const geoURL =
            "https://nominatim.openstreetmap.org/search" +
            "?format=json" +
            "&q=" + encodeURIComponent(city + ", India") +
            "&limit=1";

        const geoResponse =
            await fetch(geoURL);

        if (!geoResponse.ok) {
            throw new Error("Location search failed");
        }

        const geoData =
            await geoResponse.json();

        if (geoData.length === 0) {
            throw new Error("City not found");
        }

        const south =
            parseFloat(geoData[0].boundingbox[0]);

        const north =
            parseFloat(geoData[0].boundingbox[1]);

        const west =
            parseFloat(geoData[0].boundingbox[2]);

        const east =
            parseFloat(geoData[0].boundingbox[3]);

        const query = `
[out:json][timeout:30];
(
  nwr["amenity"="college"](${south},${west},${north},${east});
  nwr["amenity"="university"](${south},${west},${north},${east});
);
out center tags;
        `;

        const overpassURL =
            "https://overpass-api.de/api/interpreter?data=" +
            encodeURIComponent(query);

        const response =
            await fetch(overpassURL);

        if (!response.ok) {
            throw new Error("College search failed");
        }

        const data =
            await response.json();

        if (!data.elements ||
            data.elements.length === 0) {

            resultTitle.innerText =
                "No Colleges Found in " + city;

            collegeList.innerHTML = `
                <div class="welcome-card">

                    <div class="college-icon">
                        🔍
                    </div>

                    <h3>
                        No Colleges Found
                    </h3>

                    <p>
                        No college listings were found
                        in available OpenStreetMap data.
                    </p>

                </div>
            `;

            hideCollegeFilter();

            return;
        }

        resultTitle.innerText =
            data.elements.length +
            " Institutions Found in " +
            city;

        collegeList.innerHTML = "";

        /* Create Filter */

        createCollegeFilter();

        data.elements.forEach(function(place) {

            const tags = place.tags || {};

            const name =
                tags.name ||
                "Institution Name Unavailable";

            const street =
                tags["addr:street"] || "";

            const cityName =
                tags["addr:city"] || city;

            const address = street
                ? street + ", " + cityName
                : cityName;

            let type = "College";
            let icon = "🎓";

            if (tags.amenity === "university") {

                type = "University";
                icon = "🏛️";

            }

            let lat = place.lat;
            let lon = place.lon;

            if ((!lat || !lon) && place.center) {

                lat = place.center.lat;
                lon = place.center.lon;

            }

            const mapLink =
                "https://www.openstreetmap.org/?mlat=" +
                lat +
                "&mlon=" +
                lon +
                "#map=17/" +
                lat +
                "/" +
                lon;

            const website =
                tags.website ||
                tags["contact:website"] ||
                "";

            let websiteButton = "";

            if (website !== "") {

                websiteButton = `
                    <a
                        href="${website}"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="website-button"
                    >
                        🌐 Official Website
                    </a>
                `;

            }

            const collegeId =
                name.toLowerCase()
                    .replace(/[^a-z0-9]/g, "-") +
                "-" +
                lat +
                "-" +
                lon;

            const saved =
                isFavorite(collegeId);

            collegeList.innerHTML += `

                <div
                    class="college-card"
                    data-type="${type.toLowerCase()}"
                >

                    <div class="college-icon">
                        ${icon}
                    </div>

                    <span class="college-type">
                        ${type}
                    </span>

                    <h3>
                        ${name}
                    </h3>

                    <p>
                        📍 ${address}
                    </p>

                    <div class="card-buttons">

                        <button
                            class="details-button"
                            onclick="openCollegeModal(
                                '${escapeText(name)}',
                                '${escapeText(address)}',
                                '${escapeText(type)}',
                                '${icon}',
                                '${escapeText(mapLink)}',
                                '${escapeText(website)}'
                            )"
                        >
                            👁️ View Details
                        </button>

                        <a
                            href="${mapLink}"
                            target="_blank"
                            rel="noopener noreferrer"
                            class="map-button"
                        >
                            📍 Map
                        </a>

                        ${websiteButton}

                        <button
                            class="favorite-button ${saved ? "saved" : ""}"
                            onclick="toggleFavorite(
                                '${escapeText(collegeId)}',
                                '${escapeText(name)}',
                                '${escapeText(address)}'
                            )"
                        >
                            ${saved ? "❤️ Saved" : "⭐ Save"}
                        </button>

                    </div>

                </div>

            `;

        });
        searchHostels(
            south,
            west,
            north,
            east,
            city
        );
        /* Reset filter after new search */

        const filter =
            document.getElementById("collegeFilter");

        if (filter) {
            filter.value = "all";
        }

    } catch (error) {

        console.error(error);

        resultTitle.innerText =
            "Search Error";

        collegeList.innerHTML = `

            <div class="welcome-card">

                <div class="college-icon">
                    ⚠️
                </div>

                <h3>
                    Unable to Load Colleges
                </h3>

                <p>
                    Please check your internet connection
                    and try again.
                </p>

            </div>

        `;

        hideCollegeFilter();

    }

}


/* ========================================= */
/* COLLEGE FILTER FEATURE */
/* ========================================= */

function createCollegeFilter() {

    const collegeList =
        document.getElementById("collegeList");

    if (!collegeList) {
        return;
    }

    let filterBox =
        document.getElementById("collegeFilterBox");

    if (!filterBox) {

        filterBox =
            document.createElement("div");

        filterBox.id =
            "collegeFilterBox";

        filterBox.innerHTML = `

            <div class="college-filter-container">

                <label for="collegeFilter">
                    🎓 Filter Institutions:
                </label>

                <select
                    id="collegeFilter"
                    onchange="applyCollegeFilter()"
                >

                    <option value="all">
                        All
                    </option>

                    <option value="college">
                        College
                    </option>

                    <option value="university">
                        University
                    </option>

                </select>

                <span id="filterResultCount"></span>

            </div>

        `;

        collegeList.parentNode.insertBefore(
            filterBox,
            collegeList
        );

    }

    filterBox.style.display = "block";

}


/* Apply Filter */

function applyCollegeFilter() {

    const filter =
        document.getElementById("collegeFilter");

    if (!filter) {
        return;
    }

    const selectedType =
        filter.value;

    const cards =
        document.querySelectorAll(
            "#collegeList .college-card"
        );

    let visibleCount = 0;

    cards.forEach(function(card) {

        const cardType =
            card.getAttribute("data-type");

        if (
            selectedType === "all" ||
            cardType === selectedType
        ) {

            card.style.display = "";

            visibleCount++;

        } else {

            card.style.display = "none";

        }

    });

    const count =
        document.getElementById(
            "filterResultCount"
        );

    if (count) {

        count.innerText =
            visibleCount +
            " result" +
            (visibleCount !== 1 ? "s" : "");

    }

}


/* Hide Filter */

function hideCollegeFilter() {

    const filterBox =
        document.getElementById(
            "collegeFilterBox"
        );

    if (filterBox) {

        filterBox.style.display =
            "none";

    }

}


/* Escape Text */

function escapeText(text) {

    return String(text)
        .replace(/\\/g, "\\\\")
        .replace(/'/g, "\\'");

}


/* ========================================= */
/* FAVORITES */
/* ========================================= */

function getFavorites() {

    return JSON.parse(
        localStorage.getItem(
            "campusSphereFavorites"
        ) || "[]"
    );

}


function isFavorite(id) {

    const favorites =
        getFavorites();

    return favorites.some(function(item) {

        return item.id === id;

    });

}


function toggleFavorite(
    id,
    name,
    address
) {

    let favorites =
        getFavorites();

    const existingIndex =
        favorites.findIndex(function(item) {

            return item.id === id;

        });

    if (existingIndex !== -1) {

        favorites.splice(
            existingIndex,
            1
        );

        alert(
            "College removed from favorites."
        );

    } else {

        favorites.push({

            id: id,
            name: name,
            address: address

        });

        alert(
            "College saved to favorites ⭐"
        );

    }

    localStorage.setItem(
        "campusSphereFavorites",
        JSON.stringify(favorites)
    );

    displayFavorites();

    const city =
        document
            .getElementById("cityInput")
            .value
            .trim();

    if (city !== "") {

        searchColleges();

    }

}


/* Display Favorites */

function displayFavorites() {

    const favoriteList =
        document.getElementById(
            "favoriteList"
        );

    const favoriteCount =
        document.getElementById(
            "favoriteCount"
        );

    const favorites =
        getFavorites();

    favoriteCount.innerText =
        favorites.length;

    if (favorites.length === 0) {

        favoriteList.innerHTML = `

            <div class="welcome-card">

                <div class="college-icon">
                    ❤️
                </div>

                <h3>
                    No Favorite Colleges
                </h3>

                <p>
                    Save a college to see it here.
                </p>

            </div>

        `;

        return;

    }

    favoriteList.innerHTML = "";

    favorites.forEach(function(college) {

        favoriteList.innerHTML += `

            <div class="favorite-card">

                <div class="college-icon">
                    🎓
                </div>

                <h3>
                    ${college.name}
                </h3>

                <p>
                    📍 ${college.address}
                </p>

                <button
                    class="remove-favorite"
                    onclick="removeFavorite(
                        '${escapeText(college.id)}'
                    )"
                >
                    🗑️ Remove
                </button>

            </div>

        `;

    });

}


/* Remove Favorite */

function removeFavorite(id) {

    let favorites =
        getFavorites();

    favorites =
        favorites.filter(function(college) {

            return college.id !== id;

        });

    localStorage.setItem(
        "campusSphereFavorites",
        JSON.stringify(favorites)
    );

    displayFavorites();

    const city =
        document
            .getElementById("cityInput")
            .value
            .trim();

    if (city !== "") {

        searchColleges();

    }

}


/* ========================================= */
/* POPULAR CITIES */
/* ========================================= */

function selectCity(city) {

    document.getElementById(
        "cityInput"
    ).value = city;

    document.getElementById(
        "suggestions"
    ).innerHTML = "";

    searchColleges();

}


function clearSearch() {

    document.getElementById(
        "cityInput"
    ).value = "";

    document.getElementById(
        "suggestions"
    ).innerHTML = "";

    document.getElementById(
        "resultTitle"
    ).innerText =
        "Explore Colleges";

    document.getElementById(
        "collegeList"
    ).innerHTML = `

        <div class="welcome-card">

            <div class="college-icon">
                🎓
            </div>

            <h3>
                Find Your College
            </h3>

            <p>
                Enter a city above to discover colleges.
            </p>

        </div>

    `;

    hideCollegeFilter();

    document.getElementById(
        "cityInput"
    ).focus();

}


/* ========================================= */
/* SMART SUGGESTIONS */
/* ========================================= */

const popularCities = [

    "Bhopal",
    "Indore",
    "Jabalpur",
    "Delhi",
    "Mumbai",
    "Pune",
    "Bengaluru",
    "Hyderabad",
    "Jaipur",
    "Lucknow"

];


function showSuggestions() {

    const input =
        document.getElementById(
            "cityInput"
        );

    const suggestions =
        document.getElementById(
            "suggestions"
        );

    const value =
        input.value
            .trim()
            .toLowerCase();

    if (value === "") {

        suggestions.innerHTML = "";

        return;

    }

    const filteredCities =
        popularCities.filter(function(city) {

            return city
                .toLowerCase()
                .startsWith(value);

        });

    suggestions.innerHTML = "";

    filteredCities.forEach(function(city) {

        const item =
            document.createElement(
                "div"
            );

        item.className =
            "suggestion-item";

        item.innerHTML =
            "📍 " + city;

        item.onclick = function() {

            input.value = city;

            suggestions.innerHTML = "";

            searchColleges();

        };

        suggestions.appendChild(item);

    });

}


/* ========================================= */
/* COLLEGE DETAILS MODAL */
/* ========================================= */

function openCollegeModal(
    name,
    address,
    type,
    icon,
    mapLink,
    website
) {

    document.getElementById(
        "modalName"
    ).innerText = name;

    document.getElementById(
        "modalAddress"
    ).innerText =
        "📍 " + address;

    document.getElementById(
        "modalType"
    ).innerText = type;

    document.getElementById(
        "modalIcon"
    ).innerText = icon;

    document.getElementById(
        "modalMap"
    ).href = mapLink;

    const websiteButton =
        document.getElementById(
            "modalWebsite"
        );

    if (website !== "") {

        websiteButton.href =
            website;

        websiteButton.style.display =
            "inline-block";

    } else {

        websiteButton.style.display =
            "none";

    }

    document.getElementById(
        "collegeModal"
    ).classList.add("show");

}


/* Close Modal */

function closeCollegeModal() {

    document.getElementById(
        "collegeModal"
    ).classList.remove("show");

}


/* Close Modal on Outside Click */

window.onclick = function(event) {

    const modal =
        document.getElementById(
            "collegeModal"
        );

    if (event.target === modal) {

        closeCollegeModal();

    }

}


/* Escape Key */

document.addEventListener(
    "keydown",
    function(event) {

        if (event.key === "Escape") {

            closeCollegeModal();

        }

    }
);


/* Load Favorites */

displayFavorites();
/* ================================= */
/* HOSTEL SEARCH */
/* ================================= */

async function searchHostels(
    south,
    west,
    north,
    east,
    city
) {

    const hostelList =
        document.getElementById("hostelList");

    hostelList.innerHTML = `
        <div class="loading-card">
            <div class="loader"></div>
            <h3>Finding Hostels...</h3>
            <p>Please wait while we search nearby hostels.</p>
        </div>
    `;

    try {

        const hostelQuery = `
[out:json][timeout:30];
(
  nwr["tourism"="hostel"](${south},${west},${north},${east});
  nwr["amenity"="shelter"](${south},${west},${north},${east});
  nwr["name"~"hostel|Hostel|PG|Paying Guest"](${south},${west},${north},${east});
);
out center tags;
        `;

        const hostelURL =
            "https://overpass-api.de/api/interpreter?data=" +
            encodeURIComponent(hostelQuery);

        const response =
            await fetch(hostelURL);

        if (!response.ok) {
            throw new Error("Hostel search failed");
        }

        const data =
            await response.json();

        if (
            !data.elements ||
            data.elements.length === 0
        ) {

            hostelList.innerHTML = `
                <div class="welcome-card">

                    <div class="college-icon">
                        🏠
                    </div>

                    <h3>
                        No Hostels Found
                    </h3>

                    <p>
                        No hostel listings were found
                        in available OpenStreetMap data.
                    </p>

                </div>
            `;

            return;
        }

        hostelList.innerHTML = "";

        data.elements.forEach(function(place) {

            const tags =
                place.tags || {};

            const name =
                tags.name ||
                "Hostel Name Unavailable";

            const street =
                tags["addr:street"] || "";

            const cityName =
                tags["addr:city"] || city;

            const address = street
                ? street + ", " + cityName
                : cityName;

            let lat =
                place.lat;

            let lon =
                place.lon;

            if (
                (!lat || !lon) &&
                place.center
            ) {

                lat =
                    place.center.lat;

                lon =
                    place.center.lon;

            }

            const mapLink =
                "https://www.openstreetmap.org/?mlat=" +
                lat +
                "&mlon=" +
                lon +
                "#map=17/" +
                lat +
                "/" +
                lon;

            hostelList.innerHTML += `

                <div class="college-card">

                    <div class="college-icon">
                        🏠
                    </div>

                    <span class="college-type">
                        Hostel
                    </span>

                    <h3>
                        ${escapeText(name)}
                    </h3>

                    <p>
                        📍 ${escapeText(address)}
                    </p>

                    <div class="card-buttons">

                        <a
                            href="${mapLink}"
                            target="_blank"
                            rel="noopener noreferrer"
                            class="map-button"
                        >
                            📍 View on Map
                        </a>

                    </div>

                </div>

            `;

        });

    } catch (error) {

        console.error(error);

        hostelList.innerHTML = `
            <div class="welcome-card">

                <div class="college-icon">
                    ⚠️
                </div>

                <h3>
                    Unable to Load Hostels
                </h3>

                <p>
                    Please try again later.
                </p>

            </div>
        `;

    }

}

/* ========================================= */
/* HOSTEL SEARCH AND FILTER FEATURE */
/* ========================================= */

async function searchHostels(south, west, north, east, city) {

    const hostelList = document.getElementById("hostelList");

    if (!hostelList) {
        return;
    }

    hostelList.innerHTML = `
        <div class="loading-card">
            <div class="loader"></div>
            <h3>Finding Hostels...</h3>
            <p>Please wait while we search hostels.</p>
        </div>
    `;

    const query = `
        [out:json][timeout:30];
        (
            nwr["tourism"="hostel"](${south},${west},${north},${east});
            nwr["amenity"="shelter"](${south},${west},${north},${east});
            nwr["name"~"hostel|Hostel|PG|Paying Guest"](${south},${west},${north},${east});
        );
        out center tags;
    `;

    try {

        const overpassURL =
    "https://overpass-api.de/api/interpreter?data=" +
    encodeURIComponent(query);

const response = await fetch(overpassURL);

        if (!response.ok) {
            throw new Error("Hostel search failed");
        }

        const data = await response.json();

        hostelList.innerHTML = "";

        if (!data.elements || data.elements.length === 0) {

            hostelList.innerHTML = `
                <div class="welcome-card">
                    <div class="college-icon">🏠</div>
                    <h3>No Hostels Found</h3>
                    <p>
                        No hostel listings were found
                        in available OpenStreetMap data.
                    </p>
                </div>
            `;

            return;
        }

        // Filter buttons
        const filterBox = document.createElement("div");

        filterBox.className = "hostel-filter";

        filterBox.innerHTML = `
            <button onclick="filterHostels('all')">
                All
            </button>

            <button onclick="filterHostels('boys')">
                Boys
            </button>

            <button onclick="filterHostels('girls')">
                Girls
            </button>

            <button onclick="filterHostels('other')">
                Other
            </button>
        `;

        hostelList.appendChild(filterBox);

        data.elements.forEach(function(element) {

            const tags = element.tags || {};

            const name =
                tags.name ||
                tags.operator ||
                "Hostel / PG";

            const address =
                tags["addr:full"] ||
                tags["addr:street"] ||
                tags["addr:city"] ||
                city;

            let hostelType = "other";

            const lowerName = name.toLowerCase();

            if (
                lowerName.includes("boys") ||
                lowerName.includes("boy") ||
                lowerName.includes("male")
            ) {

                hostelType = "boys";

            } else if (
                lowerName.includes("girls") ||
                lowerName.includes("girl") ||
                lowerName.includes("female") ||
                lowerName.includes("women")
            ) {

                hostelType = "girls";

            }

            let lat = element.lat;
            let lon = element.lon;

            if ((!lat || !lon) && element.center) {

                lat = element.center.lat;
                lon = element.center.lon;

            }

            let mapLink =
                "https://www.google.com/maps/search/?api=1&query=" +
                encodeURIComponent(name + " " + city);

            if (lat && lon) {

                mapLink =
                    "https://www.google.com/maps/search/?api=1&query=" +
                    lat + "," + lon;

            }

            const card = document.createElement("div");

            card.className = "college-card hostel-card";

            card.setAttribute(
                "data-hostel-type",
                hostelType
            );

            card.innerHTML = `

                <span class="college-type">
                    ${hostelType.toUpperCase()}
                </span>

                <h3>
                    ${escapeText(name)}
                </h3>

                <p>
                    📍 ${escapeText(address)}
                </p>

                <a
                    href="${mapLink}"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="map-button"
                >
                    📍 View on Map
                </a>

            `;

            hostelList.appendChild(card);

        });

    } catch (error) {

        console.error(error);

        hostelList.innerHTML = `
            <div class="welcome-card">
                <div class="college-icon">⚠️</div>
                <h3>Unable to Load Hostels</h3>
                <p>
                    Please check your internet connection
                    and try again.
                </p>
            </div>
        `;

    }

}


/* ========================================= */
/* HOSTEL FILTER */
/* ========================================= */

function filterHostels(type) {

    const hostelCards =
        document.querySelectorAll(".hostel-card");

    hostelCards.forEach(function(card) {

        const hostelType =
            card.getAttribute("data-hostel-type");

        if (
            type === "all" ||
            hostelType === type
        ) {

            card.style.display = "";

        } else {

            card.style.display = "none";

        }

    });

}