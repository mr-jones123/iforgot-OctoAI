"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_COLUMNS = void 0;
// Default columns created with every new workspace
exports.DEFAULT_COLUMNS = [
    { title: "Backlog", order: 0, isReviewGate: false },
    { title: "To-do", order: 1, isReviewGate: false },
    { title: "In Progress", order: 2, isReviewGate: false },
    { title: "Review", order: 3, isReviewGate: true }, // human must manually advance
    { title: "Done", order: 4, isReviewGate: false },
];
