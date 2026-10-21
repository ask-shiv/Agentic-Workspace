import { RouterProvider, createBrowserRouter } from "react-router-dom";
import { TooltipProvider } from "./components/ui/tooltip";
import { appRoutes } from "./routes";

const router = createBrowserRouter(appRoutes);
export default function App() {
	return (
		<TooltipProvider delayDuration={200}>
			<RouterProvider router={router} />
		</TooltipProvider>
	);
}
