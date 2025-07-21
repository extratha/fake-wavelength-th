const FullScreenLoading = () => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="text-white text-xl font-medium">
        กำลังโหลด...
      </div>
    </div>
  );
};

export default FullScreenLoading;