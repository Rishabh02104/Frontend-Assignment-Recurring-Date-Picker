import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';

// --- Recurrence Context ---
// This context manages the state of the recurring date picker.
const RecurrenceContext = createContext();

const RecurrenceProvider = ({ children }) => {
  // State for recurrence settings
  const [recurrenceType, setRecurrenceType] = useState('daily'); // 'daily', 'weekly', 'monthly', 'yearly'
  const [interval, setInterval] = useState(1); // Every X days/weeks/months/years
  const [daysOfWeek, setDaysOfWeek] = useState([]); // For weekly: ['Mon', 'Tue', ...]
  const [monthlyPattern, setMonthlyPattern] = useState({ week: 'first', day: 'Monday' }); // For monthly: { week: 'first', day: 'Monday' }
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]); // YYYY-MM-DD format
  const [endDate, setEndDate] = useState(''); // YYYY-MM-DD format, optional
  const [isEndDateEnabled, setIsEndDateEnabled] = useState(false);

  // Memoized value for recurring dates to avoid re-calculation on every render
  const calculatedRecurringDates = useMemo(() => {
    // Function to calculate recurring dates based on current settings
    const calculateDates = () => {
      const start = new Date(startDate);
      const end = isEndDateEnabled && endDate ? new Date(endDate) : null;
      const dates = new Set(); // Use a Set to avoid duplicate dates

      if (!startDate) return [];

      let currentDate = new Date(start);

      // Helper to add date to set, formatted as YYYY-MM-DD
      const addDate = (date) => {
        if (!end || date <= end) {
          dates.add(date.toISOString().split('T')[0]);
        }
      };

      // Loop to generate dates based on recurrence type
      while (!end || currentDate <= end) {
        if (dates.size > 365 * 2) { // Limit to 2 years of dates to prevent infinite loops
            console.warn("Limiting recurring dates to 2 years to prevent excessive calculation.");
            break;
        }

        switch (recurrenceType) {
          case 'daily':
            addDate(currentDate);
            currentDate.setDate(currentDate.getDate() + interval);
            break;

          case 'weekly':
            // If specific days of week are selected, iterate through them
            if (daysOfWeek.length > 0) {
              const currentDay = currentDate.getDay(); // 0 for Sunday, 1 for Monday, etc.
              const daysMap = {
                'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3,
                'Thursday': 4, 'Friday': 5, 'Saturday': 6
              };
              const selectedDayIndexes = daysOfWeek.map(day => daysMap[day]);

              let foundNextDay = false;
              for (let i = 0; i < 7; i++) { // Check up to 7 days from current
                const nextDayDate = new Date(currentDate);
                nextDayDate.setDate(currentDate.getDate() + i);
                if (selectedDayIndexes.includes(nextDayDate.getDay())) {
                  addDate(nextDayDate);
                  foundNextDay = true;
                }
              }
              // Move to the next interval of weeks
              if (foundNextDay) {
                  currentDate.setDate(currentDate.getDate() + (interval * 7));
              } else { // If no day found in current week, move to next day
                  currentDate.setDate(currentDate.getDate() + 1);
              }
            } else {
              // If no specific days, just add the current date and move by interval
              addDate(currentDate);
              currentDate.setDate(currentDate.getDate() + (interval * 7));
            }
            break;

          case 'monthly':
            const targetDayOfWeek = monthlyPattern.day; // e.g., 'Monday'
            const targetWeekOrdinal = monthlyPattern.week; // e.g., 'first', 'second'

            let year = currentDate.getFullYear();
            let month = currentDate.getMonth();

            // Find the first day of the current month
            let firstDayOfMonth = new Date(year, month, 1);
            let dayOfWeekCounter = 0;
            let foundTargetDate = false;

            // Iterate through days of the month to find the target day
            for (let day = 1; day <= 31; day++) {
                const checkDate = new Date(year, month, day);
                if (checkDate.getMonth() !== month) break; // Moved to next month

                const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][checkDate.getDay()];

                if (dayName === targetDayOfWeek) {
                    dayOfWeekCounter++;
                    let isTargetWeek = false;
                    switch (targetWeekOrdinal) {
                        case 'first': isTargetWeek = (dayOfWeekCounter === 1); break;
                        case 'second': isTargetWeek = (dayOfWeekCounter === 2); break;
                        case 'third': isTargetWeek = (dayOfWeekCounter === 3); break;
                        case 'fourth': isTargetWeek = (dayOfWeekCounter === 4); break;
                        case 'last':
                            // Check if this is the last occurrence of the day in the month
                            const nextCheckDate = new Date(year, month, day + 7);
                            if (nextCheckDate.getMonth() !== month || ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][nextCheckDate.getDay()] !== targetDayOfWeek) {
                                isTargetWeek = true;
                            }
                            break;
                    }

                    if (isTargetWeek) {
                        addDate(checkDate);
                        foundTargetDate = true;
                        break; // Found the date for this month
                    }
                }
            }

            // Move to the next month based on interval
            currentDate.setMonth(currentDate.getMonth() + interval);
            currentDate.setDate(1); // Reset day to 1 to avoid issues with months having fewer days
            break;

          case 'yearly':
            addDate(currentDate);
            currentDate.setFullYear(currentDate.getFullYear() + interval);
            break;

          default:
            break;
        }
      }
      return Array.from(dates).sort(); // Return sorted array
    };

    return calculateDates();
  }, [recurrenceType, interval, daysOfWeek, monthlyPattern, startDate, endDate, isEndDateEnabled]);

  const value = {
    recurrenceType, setRecurrenceType,
    interval, setInterval,
    daysOfWeek, setDaysOfWeek,
    monthlyPattern, setMonthlyPattern,
    startDate, setStartDate,
    endDate, setEndDate,
    isEndDateEnabled, setIsEndDateEnabled,
    calculatedRecurringDates,
  };

  return (
    <RecurrenceContext.Provider value={value}>
      {children}
    </RecurrenceContext.Provider>
  );
};

// --- Custom Hook to use Recurrence Context ---
const useRecurrence = () => {
  const context = useContext(RecurrenceContext);
  if (!context) {
    throw new Error('useRecurrence must be used within a RecurrenceProvider');
  }
  return context;
};

// --- Recurrence Options Component ---
const RecurrenceOptions = () => {
  const {
    recurrenceType, setRecurrenceType,
    interval, setInterval,
    daysOfWeek, setDaysOfWeek,
    monthlyPattern, setMonthlyPattern,
  } = useRecurrence();

  const handleDayOfWeekChange = (day) => {
    setDaysOfWeek(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const weekOrdinals = ['first', 'second', 'third', 'fourth', 'last'];

  return (
    <div className="p-4 bg-white rounded-lg shadow-md mb-6">
      <h3 className="text-xl font-semibold mb-4 text-gray-800">Recurrence Options</h3>

      {/* Recurrence Type Selection */}
      <div className="flex flex-wrap gap-4 mb-6">
        {['daily', 'weekly', 'monthly', 'yearly'].map(type => (
          <label key={type} className="inline-flex items-center cursor-pointer">
            <input
              type="radio"
              className="form-radio h-5 w-5 text-blue-600 rounded-full border-gray-300 focus:ring-blue-500"
              name="recurrenceType"
              value={type}
              checked={recurrenceType === type}
              onChange={() => setRecurrenceType(type)}
            />
            <span className="ml-2 text-gray-700 capitalize">{type}</span>
          </label>
        ))}
      </div>

      {/* Interval Input */}
      <div className="mb-6">
        <label htmlFor="interval" className="block text-sm font-medium text-gray-700 mb-2">
          Every
          <input
            type="number"
            id="interval"
            min="1"
            value={interval}
            onChange={(e) => setInterval(Math.max(1, parseInt(e.target.value) || 1))}
            className="ml-2 mr-2 w-20 p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
          {recurrenceType}
          {interval > 1 ? 's' : ''}
        </label>
      </div>

      {/* Weekly Options */}
      {recurrenceType === 'weekly' && (
        <div className="mb-6 p-4 bg-blue-50 rounded-md border border-blue-200">
          <h4 className="text-lg font-medium mb-3 text-blue-800">Select Days of Week</h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {dayNames.map(day => (
              <label key={day} className="inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="form-checkbox h-5 w-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  checked={daysOfWeek.includes(day)}
                  onChange={() => handleDayOfWeekChange(day)}
                />
                <span className="ml-2 text-gray-700">{day}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Monthly Options */}
      {recurrenceType === 'monthly' && (
        <div className="mb-6 p-4 bg-green-50 rounded-md border border-green-200">
          <h4 className="text-lg font-medium mb-3 text-green-800">Monthly Pattern</h4>
          <div className="flex flex-wrap items-center gap-4">
            <label htmlFor="monthlyWeek" className="text-sm font-medium text-gray-700">The</label>
            <select
              id="monthlyWeek"
              value={monthlyPattern.week}
              onChange={(e) => setMonthlyPattern(prev => ({ ...prev, week: e.target.value }))}
              className="p-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
            >
              {weekOrdinals.map(week => (
                <option key={week} value={week} className="capitalize">{week}</option>
              ))}
            </select>
            <select
              id="monthlyDay"
              value={monthlyPattern.day}
              onChange={(e) => setMonthlyPattern(prev => ({ ...prev, day: e.target.value }))}
              className="p-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
            >
              {dayNames.map(day => (
                <option key={day} value={day}>{day}</option>
              ))}
            </select>
            <span className="text-sm font-medium text-gray-700">of every month</span>
          </div>
        </div>
      )}
    </div>
  );
};

// --- Date Range Picker Component ---
const DateRangePicker = () => {
  const {
    startDate, setStartDate,
    endDate, setEndDate,
    isEndDateEnabled, setIsEndDateEnabled,
  } = useRecurrence();

  return (
    <div className="p-4 bg-white rounded-lg shadow-md mb-6">
      <h3 className="text-xl font-semibold mb-4 text-gray-800">Date Range</h3>

      <div className="flex flex-col sm:flex-row gap-4 mb-4">
        {/* Start Date */}
        <div className="flex-1">
          <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-2">Start Date:</label>
          <input
            type="date"
            id="startDate"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>

        {/* End Date */}
        <div className="flex-1">
          <div className="flex items-center mb-2">
            <input
              type="checkbox"
              id="enableEndDate"
              className="form-checkbox h-5 w-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
              checked={isEndDateEnabled}
              onChange={(e) => setIsEndDateEnabled(e.target.checked)}
            />
            <label htmlFor="enableEndDate" className="ml-2 text-sm font-medium text-gray-700">Enable End Date</label>
          </div>
          <input
            type="date"
            id="endDate"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className={`w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 ${!isEndDateEnabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
            disabled={!isEndDateEnabled}
          />
        </div>
      </div>
    </div>
  );
};

// --- Calendar Preview Component ---
const CalendarPreview = () => {
  const { calculatedRecurringDates, startDate } = useRecurrence();
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  // Update current month/year when startDate changes
  useEffect(() => {
    if (startDate) {
      const start = new Date(startDate);
      setCurrentMonth(start.getMonth());
      setCurrentYear(start.getFullYear());
    }
  }, [startDate]);

  const daysInMonth = (month, year) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (month, year) => new Date(year, month, 1).getDay(); // 0 for Sunday

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const weekdayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const renderCalendarDays = () => {
    const totalDays = daysInMonth(currentMonth, currentYear);
    const firstDay = firstDayOfMonth(currentMonth, currentYear);
    const days = [];

    // Fill leading empty days
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="p-2"></div>);
    }

    // Fill days of the month
    for (let day = 1; day <= totalDays; day++) {
      const dateString = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const isRecurring = calculatedRecurringDates.includes(dateString);
      const isStartDate = startDate === dateString;

      days.push(
        <div
          key={dateString}
          className={`p-2 text-center rounded-md text-sm font-medium
            ${isRecurring ? 'bg-blue-200 text-blue-800 border border-blue-400' : 'text-gray-700'}
            ${isStartDate ? 'bg-green-300 text-green-900 font-bold border border-green-500' : ''}
            ${!isRecurring && !isStartDate ? 'bg-gray-50 hover:bg-gray-100' : ''}
          `}
        >
          {day}
        </div>
      );
    }
    return days;
  };

  const goToPreviousMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const goToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow-md">
      <h3 className="text-xl font-semibold mb-4 text-gray-800">Calendar Preview</h3>

      {/* Month Navigation */}
      <div className="flex justify-between items-center mb-4">
        <button
          onClick={goToPreviousMonth}
          className="p-2 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-400"
          aria-label="Previous Month"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
        </button>
        <span className="text-lg font-bold text-gray-800">
          {monthNames[currentMonth]} {currentYear}
        </span>
        <button
          onClick={goToNextMonth}
          className="p-2 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-400"
          aria-label="Next Month"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1 text-center">
        {weekdayNames.map(day => (
          <div key={day} className="font-bold text-gray-600 text-sm p-2">
            {day}
          </div>
        ))}
        {renderCalendarDays()}
      </div>

      <div className="mt-6 p-3 bg-gray-50 rounded-md border border-gray-200 text-sm text-gray-700">
        <p className="font-semibold mb-2">Legend:</p>
        <div className="flex items-center mb-1">
          <span className="w-4 h-4 bg-green-300 rounded-sm mr-2 border border-green-500"></span>
          <span>Start Date</span>
        </div>
        <div className="flex items-center">
          <span className="w-4 h-4 bg-blue-200 rounded-sm mr-2 border border-blue-400"></span>
          <span>Recurring Date</span>
        </div>
      </div>
    </div>
  );
};

// --- Main App Component ---
export default function App() {
  return (
    <RecurrenceProvider>
      <div className="min-h-screen bg-gray-100 p-4 sm:p-8 font-sans antialiased">
        <style>
          {`
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
            body { font-family: 'Inter', sans-serif; }
          `}
        </style>
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            Recurring Date Picker
          </h1>
          <RecurrenceOptions />
          <DateRangePicker />
          <CalendarPreview />

          {/* Testing Requirements - Placeholder Comments */}
          <div className="mt-10 p-6 bg-gray-50 rounded-lg border border-gray-200">
            <h3 className="text-xl font-semibold mb-4 text-gray-800">Testing Notes (Conceptual)</h3>
            <p className="mb-2 text-gray-700">
              In a real development environment, you would include unit and integration tests.
            </p>
            <ul className="list-disc list-inside text-gray-700">
              <li className="mb-1">
                <strong>Unit Tests:</strong>
                <ul className="list-disc list-inside ml-4 text-gray-600">
                  <li>Test `RecurrenceContext`'s `calculatedRecurringDates` logic for each recurrence type (daily, weekly, monthly, yearly) with various intervals and date ranges.</li>
                  <li>Verify correct date calculation for specific monthly patterns (e.g., "second Tuesday").</li>
                  <li>Test edge cases like start/end dates being the same, or intervals that skip dates.</li>
                </ul>
              </li>
              <li>
                <strong>Integration Tests:</strong>
                <ul className="list-disc list-inside ml-4 text-gray-600">
                  <li>Simulate user interactions (e.g., selecting "weekly", checking specific days, changing interval).</li>
                  <li>Assert that the `CalendarPreview` correctly highlights the expected recurring dates after these interactions.</li>
                  <li>Verify that enabling/disabling the end date correctly affects the displayed dates.</li>
                </ul>
              </li>
            </ul>
            <p className="mt-4 text-gray-700">
              These tests would typically be written using a testing library like Jest and React Testing Library.
            </p>
          </div>
        </div>
      </div>
    </RecurrenceProvider>
  );
}
