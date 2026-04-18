import React from 'react';

const SeatMap = ({ rows, cols, bookedSeats, selectedSeats, onSeatToggle }) => {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  // Generate grid
  const renderGrid = () => {
    let grid = [];
    for (let r = 0; r < rows; r++) {
      let rowLabel = alphabet[r % 26];
      let rowSeats = [];
      
      for (let c = 1; c <= cols; c++) {
        const seatId = `${rowLabel}${c}`;
        const isBooked = bookedSeats.includes(seatId);
        const isSelected = selectedSeats.includes(seatId);

        rowSeats.push(
          <button
            key={seatId}
            disabled={isBooked}
            onClick={() => onSeatToggle(seatId)}
            className={`w-8 h-8 rounded-t-lg rounded-b-sm text-[10px] font-bold transition-all duration-200 cursor-pointer
              ${isBooked 
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed opacity-50' 
                : isSelected 
                  ? 'bg-orange-500 text-white shadow-md transform scale-110' 
                  : 'bg-white border-2 border-orange-200 text-orange-600 hover:bg-orange-100 hover:border-orange-400'
              }
            `}
          >
            {c}
          </button>
        );
      }

      grid.push(
        <div key={r} className="flex items-center justify-center gap-2 mb-3">
          <div className="w-6 text-sm font-bold text-gray-400 text-right pr-2">{rowLabel}</div>
          <div className="flex gap-2">{rowSeats}</div>
          <div className="w-6 text-sm font-bold text-gray-400 pl-2">{rowLabel}</div>
        </div>
      );
    }
    return grid;
  };

  return (
    <div className="w-full overflow-x-auto pb-4 no-scrollbar">
      <div className="min-w-max mx-auto p-6 bg-gray-50 rounded-3xl border border-gray-200">
        
        {/* The Screen / Stage */}
        <div className="w-3/4 mx-auto mb-10 text-center relative">
          <div className="h-2 w-full bg-linear-to-r from-transparent via-orange-300 to-transparent rounded-full opacity-50"></div>
          <div className="text-xs font-bold text-gray-400 mt-2 tracking-[0.3em] uppercase">Stage / Screen</div>
        </div>

        {/* Seat Grid */}
        <div className="mb-8">{renderGrid()}</div>

        {/* Legend */}
        <div className="flex justify-center gap-6 pt-4 border-t border-gray-200">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-white border-2 border-orange-200 rounded-t-md"></div>
            <span className="text-xs font-medium text-gray-600">Available</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-orange-500 rounded-t-md"></div>
            <span className="text-xs font-medium text-gray-600">Selected</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gray-300 rounded-t-md"></div>
            <span className="text-xs font-medium text-gray-600">Booked</span>
          </div>
        </div>
        
      </div>
    </div>
  );
};

export default SeatMap;
