interface WeatherParams {
    lat: number;
    lon: number;
}

interface WeatherResponse {
    main: {
        temp: number; // usually Kelvin unless units specified
    };
    // other fields...
}

export const openWeatherClient = {
    getCurrentWeather: async (params: WeatherParams): Promise<WeatherResponse> => {
        const baseUrl = 'https://api.openweathermap.org/data/2.5/weather';
        const apiKey = process.env.OPENWEATHER_API_KEY;

        // Requesting metric units for Celsius
        const url = `${baseUrl}?lat=${params.lat}&lon=${params.lon}&units=metric&appid=${apiKey}`;

        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`OpenWeather API error: ${response.statusText}`);
        }

        return await response.json();
    }
};
