import { Loader } from "lucide-react";

const Loading = () => {
  return (
    <div className="flex items-center justify-center" data-testid="loader">
      <Loader className="animate-spin text-muted-foreground" size={48} />
    </div>
  );
};

export default Loading;
