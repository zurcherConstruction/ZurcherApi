import { generatePDF } from "../../utils/pdfGenerator";

const BudgetPDF = ({ budget, editMode = false }) => {
    const handleDownload = () => {
        const doc = generatePDF(budget);
        if (!doc) return;
        doc.save(`presupuesto_${budget.idBudget}.pdf`);
    };

    return (
        <div>
            <button
                onClick={handleDownload}
                className="bg-blue-950 text-white text-xs py-1 px-2 rounded-md hover:bg-indigo-700 p-2"
            >
                {editMode ? "Download PDF edit" : "Download PDF"}
            </button>
        </div>
    );
};

export default BudgetPDF;