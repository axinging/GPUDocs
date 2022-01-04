//*********************************************************
//
// Copyright (c) Microsoft. All rights reserved.
// This code is licensed under the MIT License (MIT).
// THIS CODE IS PROVIDED *AS IS* WITHOUT WARRANTY OF
// ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING ANY
// IMPLIED WARRANTIES OF FITNESS FOR A PARTICULAR
// PURPOSE, MERCHANTABILITY, OR NON-INFRINGEMENT.
//
//*********************************************************

#include "pch.h"
#include "stdafx.h"
#include "D3D12Sample.h"
#include <chrono>
#include <iostream>
#include <cmath>
#include<string>

#define PRINT_DATA

namespace
{
	//--------------------------------------------------------------------------------------
	// Inserts a resource transition operation in the command list
	//--------------------------------------------------------------------------------------
	void ResourceBarrier(_In_ ID3D12GraphicsCommandList* pCmdList, _In_ ID3D12Resource* pResource, D3D12_RESOURCE_STATES Before, D3D12_RESOURCE_STATES After, D3D12_RESOURCE_BARRIER_FLAGS Flags = D3D12_RESOURCE_BARRIER_FLAG_NONE)
	{
		D3D12_RESOURCE_BARRIER barrierDesc = {};

		barrierDesc.Type = D3D12_RESOURCE_BARRIER_TYPE_TRANSITION;
		barrierDesc.Flags = Flags;
		barrierDesc.Transition.pResource = pResource;
		barrierDesc.Transition.Subresource = D3D12_RESOURCE_BARRIER_ALL_SUBRESOURCES;
		barrierDesc.Transition.StateBefore = Before;
		barrierDesc.Transition.StateAfter = After;

		pCmdList->ResourceBarrier(1, &barrierDesc);
	}
}

D3D12Sample::D3D12Sample() :
    m_pCbSrvDataBegin(nullptr),
    m_cbSrvDescriptorSize(0),
    m_constantBufferData{},
    mStorageType(STORAGETYPE::BYTEADDRESS_BUFFER),
    mKernelType(KERNELTYPE::SLM_8X8_4X16),
    m_M(1024),
    m_N(1024),
    m_K(1024),
    m_tileK(64),
    m_componentSize(4),
    mWorkPerThreadX(8),
    mWorkPerThreadY(8),
    mLocalGroupSizeX(16),
    mLocalGroupSizeY(4)
{}

void D3D12Sample::Start(int argc, char *argv[])
{
    for (int i = 0; i < argc; ++i)
    {
        std::string cmd(argv[i]);
        if (cmd == "-h" || cmd == "--help")
        {
            std::cout << "-h, --help     List all the supported command flags." << std::endl;
            std::cout << "--storage-type texture|structured_buffer|byteAddress_buffer     Choose using which storage type to load/store data. The default one is byteAddress_buffer." << std::endl;
            std::cout << "--kernel SLM_8X8_4X16|SLM_4x4_16x16_v4|SLM_4x4_shared_A|SLM_4x4_16x16_float|SLM_4x4_16x16_4_FLOATS|MatMul_4x4_16x4_float|MatMul_vector_float Choose which algorithm to run. The default one is SLM_8X8_4X16." << std::endl;
            std::cout << "--num-dispatch int_value     Determines how many command lists will be executed. The default value is 500" << std::endl;
            std::cout << "--M int_value     The rows of the output matrix [M,N]. The default value is 1024" << std::endl;
            std::cout << "--N int_value     The colums of the output matrix [M,N]. The default value is 1024" << std::endl;
            std::cout << "--K int_value     The inner dimension length of matrix multiplication. The default value is 1024" << std::endl;
            std::cout << "--localX int_value     The local work group size X. The default value is 16" << std::endl;
            std::cout << "--localY int_value     The local work group size Y. The default value is 16" << std::endl;
            return;
        }
        else if (cmd == "--storage-type")
        {
            std::string storageType = argv[i++ + 1];
            if (storageType == "texture")
            {
                mStorageType = STORAGETYPE::TEXTURE;
            }
            else if (storageType == "structured_buffer")
            {
                mStorageType = STORAGETYPE::STRUCTURED_BUFFER;
            }
            else
            {
                mStorageType = STORAGETYPE::BYTEADDRESS_BUFFER;
            }
        }
        else if (cmd == "--kernel")
        {
            std::string kernelType = argv[i++ + 1];
            if (kernelType == "SLM_8X8_4X16")
            {
                mKernelType = KERNELTYPE::SLM_8X8_4X16;
                mWorkPerThreadY = 8;
                mWorkPerThreadX = 8;
                m_componentSize = 4;
            }
            else if (kernelType == "SLM_4x4_16x16_v4")
            {
                mKernelType = KERNELTYPE::SLM_4x4_16x16_v4;
                mWorkPerThreadY = 4;
                mWorkPerThreadX = 4;
                m_componentSize = 4;
            }
            else if (kernelType == "SLM_4x4_shared_A")
            {
                mKernelType = KERNELTYPE::SLM_4x4_shared_A;
                mWorkPerThreadY = 4;
                mWorkPerThreadX = 4;
                m_componentSize = 4;
            }
            else if (kernelType == "SLM_4x4_16x16_float")
            {
                mKernelType = KERNELTYPE::SLM_4x4_16x16_float;
                mWorkPerThreadY = 4;
                mWorkPerThreadX = 4;
                m_componentSize = 1;
            }
            else if (kernelType == "SLM_4x4_16x16_4_FLOATS")
            {
                mKernelType = KERNELTYPE::SLM_4x4_16x16_4_FLOATS;
                mWorkPerThreadY = 4;
                mWorkPerThreadX = 4;
                m_componentSize = 1;
            }
            else if (kernelType == "MatMul_4x4_16x4_float") {
                mKernelType = KERNELTYPE::MatMul_4x4_16x4_float;
                mWorkPerThreadY = 4;
                mWorkPerThreadX = 4;
                m_componentSize = 1;
            }
            else if (kernelType == "MatMul_vector_float") {
                mKernelType = KERNELTYPE::MatMul_vector_float;
                mWorkPerThreadY = 1;
                mWorkPerThreadX = 2;
                m_componentSize = 1;
            }
            else if (kernelType == "SLM_MatMul_vector_float") {
                mKernelType = KERNELTYPE::SLM_MatMul_vector_float;
                mWorkPerThreadY = 1;
                mWorkPerThreadX = 2;
                m_componentSize = 1;
            }
            else if (kernelType == "SLM_MatMul_vector_matrix_float") {
                mKernelType = KERNELTYPE::SLM_MatMul_vector_matrix_float;
                mWorkPerThreadY = 1;
                mWorkPerThreadX = 4;
                m_componentSize = 1;
            }
            else if (kernelType == "SLM_MatMul_vector_matrix_one") {
                mKernelType = KERNELTYPE::SLM_MatMul_vector_matrix_one;
                mWorkPerThreadY = 1;
                mWorkPerThreadX = 1;
                m_componentSize = 1;
            }
            else
            {
                std::cout << "Unsupported kernel type. Please input a valide kernel type." << std::endl;
                return;
            }
        }
        else if (cmd == "--num-dispatch")
        {
            char *pNext;
            m_computeCount = strtol(argv[i++ + 1], &pNext, 10);
            if (m_computeCount <= 0)
            {
                std::cerr << "Dispatch count should be larger than 0." << std::endl;
                return;
            }
        }
        else if (cmd == "--M")
        {
            char *pNext;
            m_M = strtol(argv[i++ + 1], &pNext, 10);
            if (m_M <= 0)
            {
                std::cerr << "The output matrix height M should be larger than 0." << std::endl;
                return;
            }
        }
        else if (cmd == "--N")
        {
            char *pNext;
            m_N = strtol(argv[i++ + 1], &pNext, 10);
            if (m_N <= 0)
            {
                std::cerr << "The output matrix width N should be larger than 0." << std::endl;
                return;
            }
        }
        else if (cmd == "--K")
        {
            char *pNext;
            m_K = strtol(argv[i++ + 1], &pNext, 10);
            if (m_K <= 0)
            {
                std::cerr << "The inner dimension length K should be larger than 0." << std::endl;
                return;
            }
        }
        else if (cmd == "--localX")
        {
            char *pNext;
            mLocalGroupSizeX = strtol(argv[i++ + 1], &pNext, 10);
            if (mLocalGroupSizeX <= 0)
            {
                std::cerr << "The local group size x should be larger than 0." << std::endl;
                return;
            }
        }
        else if (cmd == "--localY")
        {
            char *pNext;
            mLocalGroupSizeY = strtol(argv[i++ + 1], &pNext, 10);
            if (mLocalGroupSizeY <= 0)
            {
                std::cerr << "The local group size y should be larger than 0." << std::endl;
                return;
            }
        }
    }

    if (mKernelType != KERNELTYPE::MatMul_vector_float && mKernelType != SLM_MatMul_vector_float)
    {

        int tileM = mLocalGroupSizeY * mWorkPerThreadY;
        int tileN = mLocalGroupSizeX * mWorkPerThreadX;
        m_tileK = mLocalGroupSizeX * 4; // 4 means to get 4 float data.
        mDispatchX = ceil(float(m_N) / float(tileN));
        mDispatchY = ceil(float(m_M) / float(tileM));
        std::cout << " M = " << m_M << ", K = " << m_K << ", N = " << m_N << ", mDispatchX = " << mDispatchX << ", mDispatchY = " << mDispatchY << std::endl;

    }
    else {
        m_tileK = mLocalGroupSizeX * 4; // 4 means to get 4 float data.
        int tile = mLocalGroupSizeX * mWorkPerThreadX;
        mDispatchX = ceil(float(m_M * m_N) / float(tile));
        mDispatchY = 1;
        std::cout << " M = " << m_M << ", K = " << m_K << ", N = " << m_N << ", mDispatchX = " << mDispatchX << ", mDispatchY = " << mDispatchY << std::endl;
    }

    LoadPipeline();
    LoadAssets();
	for (int i = 0; i < 100; i++) {
		Sleep(1000);
		RunCompute();
	}
}


// Helper function for acquiring the first available hardware adapter that supports Direct3D 12.
// If no such adapter can be found, *ppAdapter will be set to nullptr.
void D3D12Sample::GetHardwareAdapter(IDXGIFactory2* pFactory, IDXGIAdapter1** ppAdapter)
{
    ComPtr<IDXGIAdapter1> adapter;
    *ppAdapter = nullptr;

    for (UINT adapterIndex = 0; DXGI_ERROR_NOT_FOUND != pFactory->EnumAdapters1(adapterIndex, &adapter); ++adapterIndex)
    {
        DXGI_ADAPTER_DESC1 desc;
        ThrowIfFailed(adapter->GetDesc1(&desc));

        if (desc.Flags & DXGI_ADAPTER_FLAG_SOFTWARE)
        {
            // Don't select the Basic Render Driver adapter.
            // If you want a software adapter, pass in "/warp" on the command line.
            continue;
        }

        // Check to see if the adapter supports Direct3D 12, but don't create the
        // actual device yet.
        if (SUCCEEDED(D3D12CreateDevice(adapter.Get(), D3D_FEATURE_LEVEL_11_0, _uuidof(ID3D12Device), nullptr)))
        {
            break;
        }
    }

    *ppAdapter = adapter.Detach();
}

void D3D12Sample::CreateDevice(const ComPtr<IDXGIFactory4>& factory)
{
    ComPtr<IDXGIAdapter1> hardwareAdapter;
    GetHardwareAdapter(factory.Get(), &hardwareAdapter);

    ThrowIfFailed(D3D12CreateDevice(
        hardwareAdapter.Get(),
        D3D_FEATURE_LEVEL_11_0,
        IID_PPV_ARGS(&m_d3d12Device)
    ));
}


/** Use to init the clock */
#define TIMER_INIT \
    LARGE_INTEGER frequency; \
    LARGE_INTEGER t1,t2; \
    double elapsedTime; \
    QueryPerformanceFrequency(&frequency);


/** Use to start the performance timer */
#define TIMER_START QueryPerformanceCounter(&t1);

/** Use to stop the performance timer and output the result to the standard stream. Less verbose than \c TIMER_STOP_VERBOSE */
#define TIMER_STOP \
    QueryPerformanceCounter(&t2); \
    elapsedTime=(float)(t2.QuadPart-t1.QuadPart)/frequency.QuadPart; \
    std::wcout<<elapsedTime<<L" sec"<< "frequency.QuadPart=" <<frequency.QuadPart <<", t2.QuadPart="<<t2.QuadPart<<std::endl;

// Load the compute pipeline dependencies.
void D3D12Sample::LoadPipeline()
{
    UINT dxgiFactoryFlags = 0;

#if defined(_DEBUG)
    // Enable the debug layer (requires the Graphics Tools "optional feature").
    // NOTE: Enabling the debug layer after device creation will invalidate the active device.
    {
        ComPtr<ID3D12Debug> debugController;
        if (SUCCEEDED(D3D12GetDebugInterface(IID_PPV_ARGS(&debugController))))
        {
            debugController->EnableDebugLayer();

            // Enable additional debug layers.
            dxgiFactoryFlags |= DXGI_CREATE_FACTORY_DEBUG;
        }
    }
#endif

    // Create DXGIFactory.
    ComPtr<IDXGIFactory4> factory;
    ThrowIfFailed(CreateDXGIFactory2(dxgiFactoryFlags, IID_PPV_ARGS(&factory)));

    TIMER_INIT

    {
       TIMER_START
       Sleep(1000);
       TIMER_STOP
    }

    {
        TIMER_START
            Sleep(1234);
        TIMER_STOP
    }

    // Create device.
    CreateDevice(factory);   
    
    // Describe and create the command queue.
    D3D12_COMMAND_QUEUE_DESC queueDesc = { D3D12_COMMAND_LIST_TYPE_DIRECT, 0, D3D12_COMMAND_QUEUE_FLAG_NONE };

    ThrowIfFailed(m_d3d12Device->CreateCommandQueue(&queueDesc, IID_PPV_ARGS(&m_commandQueue)));
    ThrowIfFailed(m_commandQueue->GetTimestampFrequency(&m_timestampFrequency));
    LARGE_INTEGER cputimestampFrequency;
      // m_cputimestampFrequency;
    QueryPerformanceFrequency(&cputimestampFrequency);
    m_cputimestampFrequency = UINT64(cputimestampFrequency.QuadPart);// / 1000.0;

    printf("\nm_timestampFrequency =%lld, m_cputimestampFrequency=%lld\n", m_timestampFrequency, m_cputimestampFrequency);
    ThrowIfFailed(
        m_d3d12Device->CreateCommandAllocator(D3D12_COMMAND_LIST_TYPE_DIRECT, IID_PPV_ARGS(&m_computeAllocator)));


    // Create descriptor heaps.
    {
        // Describe and create a constant buffer view, shader resource views and unordered access view descriptor heap.
        // Flags indicate that this descriptor heap can be bound to the pipeline 
        // and that descriptors contained in it can be referenced by a root table.
        D3D12_DESCRIPTOR_HEAP_DESC heapDesc = {};
        heapDesc.NumDescriptors = 4;  // 1 constant buffer, 2 SRV, 1 UAV.
        heapDesc.Flags = D3D12_DESCRIPTOR_HEAP_FLAG_SHADER_VISIBLE;
        heapDesc.Type = D3D12_DESCRIPTOR_HEAP_TYPE_CBV_SRV_UAV;
        ThrowIfFailed(m_d3d12Device->CreateDescriptorHeap(&heapDesc, IID_PPV_ARGS(&m_cbSrvHeap)));

        m_cbSrvDescriptorSize = m_d3d12Device->GetDescriptorHandleIncrementSize(D3D12_DESCRIPTOR_HEAP_TYPE_CBV_SRV_UAV);
    }
}

// Load the sample assets.
void D3D12Sample::LoadAssets()
{
    // Create root signatures.
    {
        D3D12_FEATURE_DATA_ROOT_SIGNATURE featureData = {};

        // This is the highest version the sample supports. If CheckFeatureSupport succeeds, the HighestVersion returned will not be greater than this.
        featureData.HighestVersion = D3D_ROOT_SIGNATURE_VERSION_1_1;

        CD3DX12_DESCRIPTOR_RANGE1 ranges[3];
        CD3DX12_ROOT_PARAMETER1 rootParameters[3];

        if (FAILED(m_d3d12Device->CheckFeatureSupport(D3D12_FEATURE_ROOT_SIGNATURE, &featureData, sizeof(featureData))))
        {
            featureData.HighestVersion = D3D_ROOT_SIGNATURE_VERSION_1_0;
        }
        // Root signature for compute pass.
        ranges[0].Init(D3D12_DESCRIPTOR_RANGE_TYPE_CBV, 1, 0, 0, D3D12_DESCRIPTOR_RANGE_FLAG_NONE);
        ranges[1].Init(D3D12_DESCRIPTOR_RANGE_TYPE_SRV, 2, 0, 0, D3D12_DESCRIPTOR_RANGE_FLAG_NONE);
        ranges[2].Init(D3D12_DESCRIPTOR_RANGE_TYPE_UAV, 1, 0, 0, D3D12_DESCRIPTOR_RANGE_FLAG_NONE);
        rootParameters[0].InitAsDescriptorTable(1, &ranges[0], D3D12_SHADER_VISIBILITY_ALL);
        rootParameters[1].InitAsDescriptorTable(1, &ranges[1], D3D12_SHADER_VISIBILITY_ALL);
        rootParameters[2].InitAsDescriptorTable(1, &ranges[2], D3D12_SHADER_VISIBILITY_ALL);

        CD3DX12_VERSIONED_ROOT_SIGNATURE_DESC rootSignatureDesc;
        rootSignatureDesc.Init_1_1(_countof(rootParameters), rootParameters, 0, nullptr, D3D12_ROOT_SIGNATURE_FLAG_NONE);

        ComPtr<ID3DBlob> signature;
        ComPtr<ID3DBlob> error;
        ThrowIfFailed(D3DX12SerializeVersionedRootSignature(&rootSignatureDesc, featureData.HighestVersion, &signature, &error));
        ThrowIfFailed(m_d3d12Device->CreateRootSignature(0, signature->GetBufferPointer(), signature->GetBufferSize(), IID_PPV_ARGS(&m_computeRootSignature)));
    }

    // Create the compute pipeline state, which includes compiling and loading shaders.
    D3D12_COMPUTE_PIPELINE_STATE_DESC descComputePSO = {};
    descComputePSO.pRootSignature = m_computeRootSignature.Get();
    ComPtr<ID3DBlob> computeShader;
    UINT compileFlags = 0;

    std::vector<D3D_SHADER_MACRO> defines;
    static const D3D_SHADER_MACRO useTexture = { "USE_TEXTURE", "1" };
    static const D3D_SHADER_MACRO useStructuredBuffer = { "USE_STRUCTURED_BUFFERS", "1" };
    static const D3D_SHADER_MACRO terminator = {};
    if (mStorageType == STORAGETYPE::TEXTURE)
    {
        defines.push_back(useTexture);
    }
    else if (mStorageType == STORAGETYPE::STRUCTURED_BUFFER)
    {
        defines.push_back(useStructuredBuffer);
    }
    // Pass the workgroup size.
    std::string localXStr = std::to_string(mLocalGroupSizeX);
    std::string localYStr = std::to_string(mLocalGroupSizeY);
    std::string workPerThreadXStr = std::to_string(mWorkPerThreadX);
    std::string workPerThreadYStr = std::to_string(mWorkPerThreadY);
    defines.push_back({ "LOCAL_GROUP_SIZE_X", localXStr.c_str()});
    defines.push_back({ "LOCAL_GROUP_SIZE_Y", localYStr.c_str()});
    defines.push_back({ "WORK_PER_THREAD_X", workPerThreadXStr.c_str()});
    defines.push_back({ "WORK_PER_THREAD_Y", workPerThreadYStr.c_str()});
    defines.push_back(terminator);

    if (mKernelType == KERNELTYPE::SLM_8X8_4X16)
    {
        ThrowIfFailed(D3DCompileFromFile(L"SLM_8X8_4X16.hlsl", defines.data(), nullptr, "CSMain", "cs_5_0", compileFlags, 0, &computeShader, nullptr));
    }
    else if (mKernelType == KERNELTYPE::SLM_4x4_16x16_v4)
    {
        ThrowIfFailed(D3DCompileFromFile(L"SLM_4x4_16x16_vec4.hlsl", defines.data(), nullptr, "main", "cs_5_0", compileFlags, 0, &computeShader, nullptr));
    }
    else if (mKernelType == KERNELTYPE::SLM_4x4_shared_A)
    {
        ThrowIfFailed(D3DCompileFromFile(L"SLM_4X4_shared_A.hlsl", defines.data(), nullptr, "main", "cs_5_0", compileFlags, 0, &computeShader, nullptr));
    }
    else if (mKernelType == KERNELTYPE::SLM_4x4_16x16_4_FLOATS)
    {
        ThrowIfFailed(D3DCompileFromFile(L"SLM_4x4_16x16_4_floats.hlsl", defines.data(), nullptr, "main", "cs_5_0", compileFlags, 0, &computeShader, nullptr));
    }
    else if (mKernelType == KERNELTYPE::MatMul_4x4_16x4_float)
    {
        ThrowIfFailed(D3DCompileFromFile(L"Matmul_4x4_16x4.hlsl", defines.data(), nullptr, "main", "cs_5_0", compileFlags, 0, &computeShader, nullptr));
    }
    else if (mKernelType == KERNELTYPE::MatMul_vector_float)
    {
        ThrowIfFailed(D3DCompileFromFile(L"Matmul_vector.hlsl", defines.data(), nullptr, "main", "cs_5_0", compileFlags, 0, &computeShader, nullptr));
    }
    else if (mKernelType == KERNELTYPE::SLM_MatMul_vector_float)
    {
        ThrowIfFailed(D3DCompileFromFile(L"SLM_Matmul_vector.hlsl", defines.data(), nullptr, "main", "cs_5_0", compileFlags, 0, &computeShader, nullptr));
    }
    else if (mKernelType == KERNELTYPE::SLM_MatMul_vector_matrix_float)
    {
        ThrowIfFailed(D3DCompileFromFile(L"SLM_Matmul_vector_matrix.hlsl", defines.data(), nullptr, "main", "cs_5_0", compileFlags, 0, &computeShader, nullptr));
    }
    else if (mKernelType == KERNELTYPE::SLM_MatMul_vector_matrix_one)
    {
        ThrowIfFailed(D3DCompileFromFile(L"SLM_Matmul_vector_matrix_one.hlsl", defines.data(), nullptr, "main", "cs_5_0", compileFlags, 0, &computeShader, nullptr));
    }
    else
    {
        assert(mKernelType == KERNELTYPE::SLM_4x4_16x16_float);
        ThrowIfFailed(D3DCompileFromFile(L"SLM_4x4_16x16.hlsl", defines.data(), nullptr, "main", "cs_5_0", compileFlags, 0, &computeShader, nullptr));
    }

    descComputePSO.CS = CD3DX12_SHADER_BYTECODE(computeShader.Get());
    ThrowIfFailed(m_d3d12Device->CreateComputePipelineState(&descComputePSO, IID_PPV_ARGS(&m_computePSO)));
    m_computePSO->SetName(L"Compute PSO");

    // Create the command list.
    ThrowIfFailed(
        m_d3d12Device->CreateCommandList(
            0,
            D3D12_COMMAND_LIST_TYPE_DIRECT,
            m_computeAllocator.Get(),
            m_computePSO.Get(),
            IID_PPV_ARGS(&m_commandList)));

    // Create a constant buffer.
    {
        ThrowIfFailed(m_d3d12Device->CreateCommittedResource(
            &CD3DX12_HEAP_PROPERTIES(D3D12_HEAP_TYPE_UPLOAD),
            D3D12_HEAP_FLAG_NONE,
            &CD3DX12_RESOURCE_DESC::Buffer(256),
            D3D12_RESOURCE_STATE_GENERIC_READ,
            nullptr,
            IID_PPV_ARGS(&m_intermediateBuffer)));

        ThrowIfFailed(m_d3d12Device->CreateCommittedResource(
            &CD3DX12_HEAP_PROPERTIES(D3D12_HEAP_TYPE_DEFAULT),
            D3D12_HEAP_FLAG_NONE,
            &CD3DX12_RESOURCE_DESC::Buffer(256),
            D3D12_RESOURCE_STATE_VERTEX_AND_CONSTANT_BUFFER,
            nullptr,
            IID_PPV_ARGS(&m_constantBuffer)));

        ResourceBarrier(m_commandList.Get(), m_constantBuffer.Get(), D3D12_RESOURCE_STATE_VERTEX_AND_CONSTANT_BUFFER, D3D12_RESOURCE_STATE_COPY_DEST);
        m_constantBufferData.M = m_M;
        m_constantBufferData.N = m_N;
        m_constantBufferData.K = m_K;
        m_constantBufferData.TILE_K = m_tileK;
		D3D12_SUBRESOURCE_DATA bufferData = {};
        bufferData.pData = &m_constantBufferData;
        bufferData.RowPitch = sizeof(m_constantBufferData);
        UpdateSubresources(m_commandList.Get(), m_constantBuffer.Get(), m_intermediateBuffer.Get(), 0, 0, 1, &bufferData);
        ResourceBarrier(m_commandList.Get(), m_constantBuffer.Get(), D3D12_RESOURCE_STATE_COPY_DEST, D3D12_RESOURCE_STATE_VERTEX_AND_CONSTANT_BUFFER);

        // Describe and create a constant buffer view.
        D3D12_CONSTANT_BUFFER_VIEW_DESC cbvDesc = {};
        cbvDesc.BufferLocation = m_constantBuffer->GetGPUVirtualAddress();
        cbvDesc.SizeInBytes = (sizeof(SceneConstantBuffer) + 255) & ~255;    // CB size is required to be 256-byte aligned.
        CD3DX12_CPU_DESCRIPTOR_HANDLE cbHandle(m_cbSrvHeap->GetCPUDescriptorHandleForHeapStart());
        m_d3d12Device->CreateConstantBufferView(&cbvDesc, cbHandle);
    }

    if (mStorageType == STORAGETYPE::TEXTURE)
    {
        LoadTextureResources();
    }
    else
    {
        LoadBufferResources();
    }

    // Close the command list and execute it to begin the buffer copy into
    // the default heap.
    ThrowIfFailed(m_commandList->Close());
    ID3D12CommandList* ppCommandLists[] = { m_commandList.Get() };

    m_commandQueue->ExecuteCommandLists(_countof(ppCommandLists), ppCommandLists);

    // Create synchronization objects and wait until assets have been uploaded to the GPU.
    {
        ThrowIfFailed(m_d3d12Device->CreateFence(0, D3D12_FENCE_FLAG_NONE, IID_PPV_ARGS(&m_computeFence)));
        m_computeFenceValue = 1;

        // Create an event handle to use for frame synchronization.
        m_computeFenceEvent = CreateEvent(nullptr, FALSE, FALSE, nullptr);
        if (m_computeFenceEvent == nullptr)
        {
            ThrowIfFailed(HRESULT_FROM_WIN32(GetLastError()));
        }

        // Wait for the command list to execute; we are reusing the same command
        // list in our main loop but for now, we just want to wait for setup to
        // complete before continuing.
        WaitForGpu();
    }

}

void D3D12Sample::LoadTextureResources()
{
    {
        // Create the texture1.
        const UINT elementCount = m_M * m_K;
        for (int i = 0; i < elementCount; ++i)
        {
            buf1Data.push_back((float)rand() / float(RAND_MAX));
        }
        const UINT bufferSize = buf1Data.size() * sizeof(float);

        ThrowIfFailed(m_d3d12Device->CreateCommittedResource(
            &CD3DX12_HEAP_PROPERTIES(D3D12_HEAP_TYPE_UPLOAD),
            D3D12_HEAP_FLAG_NONE,
            &CD3DX12_RESOURCE_DESC::Buffer(bufferSize),
            D3D12_RESOURCE_STATE_GENERIC_READ,
            nullptr,
            IID_PPV_ARGS(&m_intermediatebuffer1)));

        ThrowIfFailed(m_d3d12Device->CreateCommittedResource(
            &CD3DX12_HEAP_PROPERTIES(D3D12_HEAP_TYPE_DEFAULT),
            D3D12_HEAP_FLAG_NONE,
            &CD3DX12_RESOURCE_DESC::Tex2D(DXGI_FORMAT_R32G32B32A32_FLOAT, m_K / m_componentSize, m_M),
            D3D12_RESOURCE_STATE_NON_PIXEL_SHADER_RESOURCE,
            nullptr,
            IID_PPV_ARGS(&mTexture1)));

        ResourceBarrier(m_commandList.Get(), mTexture1.Get(), D3D12_RESOURCE_STATE_NON_PIXEL_SHADER_RESOURCE, D3D12_RESOURCE_STATE_COPY_DEST);
        D3D12_SUBRESOURCE_DATA bufferData = {};
        bufferData.pData = buf1Data.data();
        bufferData.RowPitch = m_K * sizeof(float);
        bufferData.SlicePitch = bufferData.RowPitch * m_M;
        UpdateSubresources(m_commandList.Get(), mTexture1.Get(), m_intermediatebuffer1.Get(), 0, 0, 1, &bufferData);
        ResourceBarrier(m_commandList.Get(), mTexture1.Get(), D3D12_RESOURCE_STATE_COPY_DEST, D3D12_RESOURCE_STATE_NON_PIXEL_SHADER_RESOURCE);

        // Create SRV for the texture1
        D3D12_SHADER_RESOURCE_VIEW_DESC srvDesc = {};
        srvDesc.Shader4ComponentMapping = D3D12_DEFAULT_SHADER_4_COMPONENT_MAPPING;
        srvDesc.ViewDimension = D3D12_SRV_DIMENSION_TEXTURE2D;
        srvDesc.Texture2D.MipLevels = 1;
        srvDesc.Format = DXGI_FORMAT_R32G32B32A32_FLOAT;
        CD3DX12_CPU_DESCRIPTOR_HANDLE srvHandle(m_cbSrvHeap->GetCPUDescriptorHandleForHeapStart());
        srvHandle.Offset(1, m_cbSrvDescriptorSize); // First one is for constant buffer.
        m_d3d12Device->CreateShaderResourceView(mTexture1.Get(), &srvDesc, srvHandle);
    }

	{
		// create the texture2
		const UINT elementCount = m_K * m_N;
		for (int i = 0; i < elementCount; ++i)
		{
			buf2Data.push_back((float)rand() / float(RAND_MAX));
		}
		const UINT bufferSize = buf2Data.size() * sizeof(float);

		ThrowIfFailed(m_d3d12Device->CreateCommittedResource(
			&CD3DX12_HEAP_PROPERTIES(D3D12_HEAP_TYPE_UPLOAD),
			D3D12_HEAP_FLAG_NONE,
			&CD3DX12_RESOURCE_DESC::Buffer(bufferSize),
			D3D12_RESOURCE_STATE_GENERIC_READ,
			nullptr,
			IID_PPV_ARGS(&m_intermediatebuffer2)));

		ThrowIfFailed(m_d3d12Device->CreateCommittedResource(
			&CD3DX12_HEAP_PROPERTIES(D3D12_HEAP_TYPE_DEFAULT),
			D3D12_HEAP_FLAG_NONE,
			&CD3DX12_RESOURCE_DESC::Tex2D(DXGI_FORMAT_R32G32B32A32_FLOAT, m_N / m_componentSize, m_K),
			D3D12_RESOURCE_STATE_NON_PIXEL_SHADER_RESOURCE,
			nullptr,
			IID_PPV_ARGS(&mTexture2)));

		ResourceBarrier(m_commandList.Get(), mTexture2.Get(), D3D12_RESOURCE_STATE_NON_PIXEL_SHADER_RESOURCE, D3D12_RESOURCE_STATE_COPY_DEST);
		D3D12_SUBRESOURCE_DATA bufferData = {};
		bufferData.pData = buf2Data.data();
		bufferData.RowPitch = m_N * sizeof(float);
		bufferData.SlicePitch = bufferData.RowPitch * m_K;
		UpdateSubresources(m_commandList.Get(), mTexture2.Get(), m_intermediatebuffer2.Get(), 0, 0, 1, &bufferData);
		ResourceBarrier(m_commandList.Get(), mTexture2.Get(), D3D12_RESOURCE_STATE_COPY_DEST, D3D12_RESOURCE_STATE_NON_PIXEL_SHADER_RESOURCE);

		// Create SRV for texure2
		D3D12_SHADER_RESOURCE_VIEW_DESC srvDesc = {};
		srvDesc.Shader4ComponentMapping = D3D12_DEFAULT_SHADER_4_COMPONENT_MAPPING;
		srvDesc.ViewDimension = D3D12_SRV_DIMENSION_TEXTURE2D;
		srvDesc.Texture2D.MipLevels = 1;
		srvDesc.Format = DXGI_FORMAT_R32G32B32A32_FLOAT;

		CD3DX12_CPU_DESCRIPTOR_HANDLE srvHandle(m_cbSrvHeap->GetCPUDescriptorHandleForHeapStart());
		srvHandle.Offset(2, m_cbSrvDescriptorSize); // First one is for constant buffer. Senond one is for buffer1
		m_d3d12Device->CreateShaderResourceView(mTexture2.Get(), &srvDesc, srvHandle);
	}
	// Create textureResult and UAV for it.
	{
		const UINT elementCount = m_M * m_N;
		const UINT bufferSize = elementCount * sizeof(float);

		ThrowIfFailed(m_d3d12Device->CreateCommittedResource(
			&CD3DX12_HEAP_PROPERTIES(D3D12_HEAP_TYPE_DEFAULT),
			D3D12_HEAP_FLAG_NONE,
			&CD3DX12_RESOURCE_DESC::Tex2D(DXGI_FORMAT_R32G32B32A32_FLOAT, m_N / m_componentSize, m_M, 1, 0, 1, 0, D3D12_RESOURCE_FLAG_ALLOW_UNORDERED_ACCESS),
			D3D12_RESOURCE_STATE_UNORDERED_ACCESS,
			nullptr,
			IID_PPV_ARGS(&mTextureResult))
		);

		// Create UAV for textureResult
		D3D12_UNORDERED_ACCESS_VIEW_DESC uavDesc = {};
		uavDesc.ViewDimension = D3D12_UAV_DIMENSION_TEXTURE2D;
		uavDesc.Texture2D.MipSlice = 0;
		uavDesc.Texture2D.PlaneSlice = 0;
		uavDesc.Format = DXGI_FORMAT_R32G32B32A32_FLOAT;

		CD3DX12_CPU_DESCRIPTOR_HANDLE uavHandle(m_cbSrvHeap->GetCPUDescriptorHandleForHeapStart());
		uavHandle.Offset(3, m_cbSrvDescriptorSize); // First one is for constant buffer. Senond one is for buffer1. Third one is for buffer2.
		m_d3d12Device->CreateUnorderedAccessView(mTextureResult.Get(), nullptr, &uavDesc, uavHandle);
	}

	// Create the query result buffer.
	{
		// Two timestamps for each frame.
		const UINT resultCount = 2 * m_computeCount;
		const UINT resultBufferSize = resultCount * sizeof(UINT64);
		D3D12_QUERY_HEAP_DESC timestampHeapDesc = {};
		timestampHeapDesc.Type = D3D12_QUERY_HEAP_TYPE_TIMESTAMP;
		timestampHeapDesc.Count = resultCount;

		ThrowIfFailed(m_d3d12Device->CreateCommittedResource(
			&CD3DX12_HEAP_PROPERTIES(D3D12_HEAP_TYPE_READBACK),
			D3D12_HEAP_FLAG_NONE,
			&CD3DX12_RESOURCE_DESC::Buffer(resultBufferSize),
			D3D12_RESOURCE_STATE_COPY_DEST,
			nullptr,
			IID_PPV_ARGS(&m_queryResult)
		));
		ThrowIfFailed(m_d3d12Device->CreateQueryHeap(&timestampHeapDesc, IID_PPV_ARGS(&m_queryHeap)));
	}
}

void D3D12Sample::LoadBufferResources()
{
    {
        // Create the buffer1.
        const UINT elementCount = m_M * m_K;
        for ( int i = 0; i < elementCount; ++i )
        {
            buf1Data.push_back((float) rand() / float(RAND_MAX));
        }
        const UINT bufferSize = buf1Data.size() * sizeof(float);

        ThrowIfFailed(m_d3d12Device->CreateCommittedResource(
            &CD3DX12_HEAP_PROPERTIES(D3D12_HEAP_TYPE_UPLOAD),
            D3D12_HEAP_FLAG_NONE,
            &CD3DX12_RESOURCE_DESC::Buffer(bufferSize),
            D3D12_RESOURCE_STATE_GENERIC_READ,
            nullptr,
            IID_PPV_ARGS(&m_intermediatebuffer1)));

        ThrowIfFailed(m_d3d12Device->CreateCommittedResource(
            &CD3DX12_HEAP_PROPERTIES(D3D12_HEAP_TYPE_DEFAULT),
            D3D12_HEAP_FLAG_NONE,
            &CD3DX12_RESOURCE_DESC::Buffer(bufferSize),
            D3D12_RESOURCE_STATE_NON_PIXEL_SHADER_RESOURCE,
            nullptr,
            IID_PPV_ARGS(&m_buffer1)));

        ResourceBarrier(m_commandList.Get(), m_buffer1.Get(), D3D12_RESOURCE_STATE_NON_PIXEL_SHADER_RESOURCE, D3D12_RESOURCE_STATE_COPY_DEST);
        D3D12_SUBRESOURCE_DATA bufferData = {};
        bufferData.pData = buf1Data.data();
        bufferData.RowPitch = bufferSize;
        UpdateSubresources(m_commandList.Get(), m_buffer1.Get(), m_intermediatebuffer1.Get(), 0, 0, 1, &bufferData);
        ResourceBarrier(m_commandList.Get(), m_buffer1.Get(), D3D12_RESOURCE_STATE_COPY_DEST, D3D12_RESOURCE_STATE_NON_PIXEL_SHADER_RESOURCE);

        // Create SRV for the buffer1
        D3D12_SHADER_RESOURCE_VIEW_DESC srvDesc = {};
        srvDesc.Shader4ComponentMapping = D3D12_DEFAULT_SHADER_4_COMPONENT_MAPPING;
        srvDesc.ViewDimension = D3D12_SRV_DIMENSION_BUFFER;
        srvDesc.Buffer.FirstElement = 0;
        if (mStorageType == STORAGETYPE::STRUCTURED_BUFFER)
        {
            srvDesc.Format = DXGI_FORMAT_UNKNOWN;
            srvDesc.Buffer.NumElements = elementCount / m_componentSize;
            srvDesc.Buffer.StructureByteStride = m_componentSize * sizeof(float);
            srvDesc.Buffer.Flags = D3D12_BUFFER_SRV_FLAG_NONE;
        }
        else
        {
            srvDesc.Format = DXGI_FORMAT_R32_TYPELESS;
            srvDesc.Buffer.NumElements = elementCount;
            srvDesc.Buffer.Flags = D3D12_BUFFER_SRV_FLAG_RAW;
        }
        CD3DX12_CPU_DESCRIPTOR_HANDLE srvHandle(m_cbSrvHeap->GetCPUDescriptorHandleForHeapStart());
        srvHandle.Offset(1, m_cbSrvDescriptorSize); // First one is for constant buffer.
        m_d3d12Device->CreateShaderResourceView(m_buffer1.Get(), &srvDesc, srvHandle);
    }

    {
        // create the buffer2
        const UINT elementCount = m_K * m_N;
        for (int i = 0; i < elementCount; ++i)
        {
            buf2Data.push_back((float)rand() / float(RAND_MAX));
        }
        const UINT bufferSize = buf2Data.size() * sizeof(float);

        ThrowIfFailed(m_d3d12Device->CreateCommittedResource(
            &CD3DX12_HEAP_PROPERTIES(D3D12_HEAP_TYPE_UPLOAD),
            D3D12_HEAP_FLAG_NONE,
            &CD3DX12_RESOURCE_DESC::Buffer(bufferSize),
            D3D12_RESOURCE_STATE_GENERIC_READ,
            nullptr,
            IID_PPV_ARGS(&m_intermediatebuffer2)));

        ThrowIfFailed(m_d3d12Device->CreateCommittedResource(
            &CD3DX12_HEAP_PROPERTIES(D3D12_HEAP_TYPE_DEFAULT),
            D3D12_HEAP_FLAG_NONE,
            &CD3DX12_RESOURCE_DESC::Buffer(bufferSize),
            D3D12_RESOURCE_STATE_NON_PIXEL_SHADER_RESOURCE,
            nullptr,
            IID_PPV_ARGS(&m_buffer2)));

        ResourceBarrier(m_commandList.Get(), m_buffer2.Get(), D3D12_RESOURCE_STATE_NON_PIXEL_SHADER_RESOURCE, D3D12_RESOURCE_STATE_COPY_DEST);
        D3D12_SUBRESOURCE_DATA bufferData = {};
        bufferData.pData = buf2Data.data();
        bufferData.RowPitch = bufferSize;
        UpdateSubresources(m_commandList.Get(), m_buffer2.Get(), m_intermediatebuffer2.Get(), 0, 0, 1, &bufferData);
        ResourceBarrier(m_commandList.Get(), m_buffer2.Get(), D3D12_RESOURCE_STATE_COPY_DEST, D3D12_RESOURCE_STATE_NON_PIXEL_SHADER_RESOURCE);

        // Create SRV for buffer2
        D3D12_SHADER_RESOURCE_VIEW_DESC srvDesc = {};
        srvDesc.Shader4ComponentMapping = D3D12_DEFAULT_SHADER_4_COMPONENT_MAPPING;
        srvDesc.ViewDimension = D3D12_SRV_DIMENSION_BUFFER;
        srvDesc.Buffer.FirstElement = 0;
        if (mStorageType == STORAGETYPE::STRUCTURED_BUFFER)
        {
            srvDesc.Format = DXGI_FORMAT_UNKNOWN;
            srvDesc.Buffer.NumElements = elementCount / m_componentSize;
            srvDesc.Buffer.StructureByteStride = m_componentSize * sizeof(float);
            srvDesc.Buffer.Flags = D3D12_BUFFER_SRV_FLAG_NONE;
        }
        else
        {
            srvDesc.Format = DXGI_FORMAT_R32_TYPELESS;
            srvDesc.Buffer.NumElements = elementCount;
            srvDesc.Buffer.Flags = D3D12_BUFFER_SRV_FLAG_RAW;
        }
        CD3DX12_CPU_DESCRIPTOR_HANDLE srvHandle(m_cbSrvHeap->GetCPUDescriptorHandleForHeapStart());
        srvHandle.Offset(2, m_cbSrvDescriptorSize); // First one is for constant buffer. Senond one is for buffer1
        m_d3d12Device->CreateShaderResourceView(m_buffer2.Get(), &srvDesc, srvHandle);
	}
        // Create bufferResult and UAV for it.
    {
        const UINT elementCount = m_M * m_N;
        const UINT bufferSize = elementCount * sizeof(float);

        ThrowIfFailed(m_d3d12Device->CreateCommittedResource(
            &CD3DX12_HEAP_PROPERTIES(D3D12_HEAP_TYPE_DEFAULT),
            D3D12_HEAP_FLAG_NONE,
            &CD3DX12_RESOURCE_DESC::Buffer(bufferSize, D3D12_RESOURCE_FLAG_ALLOW_UNORDERED_ACCESS),
            D3D12_RESOURCE_STATE_UNORDERED_ACCESS,
            nullptr,
            IID_PPV_ARGS(&m_bufferResult))
        );

        // Create UAV for bufferResult
        D3D12_UNORDERED_ACCESS_VIEW_DESC uavDesc = {};
        uavDesc.ViewDimension = D3D12_UAV_DIMENSION_BUFFER;
        uavDesc.Buffer.FirstElement = 0;
        if (mStorageType == STORAGETYPE::STRUCTURED_BUFFER)
        {
            uavDesc.Format = DXGI_FORMAT_UNKNOWN;
            uavDesc.Buffer.NumElements = elementCount / m_componentSize;
            uavDesc.Buffer.StructureByteStride = m_componentSize * sizeof(float);
            uavDesc.Buffer.Flags = D3D12_BUFFER_UAV_FLAG_NONE;
        }
        else {
            uavDesc.Format = DXGI_FORMAT_R32_TYPELESS;
            uavDesc.Buffer.NumElements = elementCount;
            uavDesc.Buffer.Flags = D3D12_BUFFER_UAV_FLAG_RAW;
        }
            CD3DX12_CPU_DESCRIPTOR_HANDLE uavHandle(m_cbSrvHeap->GetCPUDescriptorHandleForHeapStart());
            uavHandle.Offset(3, m_cbSrvDescriptorSize); // First one is for constant buffer. Senond one is for buffer1. Third one is for buffer2.
            m_d3d12Device->CreateUnorderedAccessView(m_bufferResult.Get(), nullptr, &uavDesc, uavHandle);
        }

    // Create the query result buffer.
    {
        // Two timestamps for each frame.
        const UINT resultCount = 2 * m_computeCount;
        const UINT resultBufferSize = resultCount * sizeof(UINT64);
        D3D12_QUERY_HEAP_DESC timestampHeapDesc = {};
        timestampHeapDesc.Type = D3D12_QUERY_HEAP_TYPE_TIMESTAMP;
        timestampHeapDesc.Count = resultCount;

        ThrowIfFailed(m_d3d12Device->CreateCommittedResource(
            &CD3DX12_HEAP_PROPERTIES(D3D12_HEAP_TYPE_READBACK),
            D3D12_HEAP_FLAG_NONE,
            &CD3DX12_RESOURCE_DESC::Buffer(resultBufferSize),
            D3D12_RESOURCE_STATE_COPY_DEST,
            nullptr,
            IID_PPV_ARGS(&m_queryResult)
            ));
        ThrowIfFailed(m_d3d12Device->CreateQueryHeap(&timestampHeapDesc, IID_PPV_ARGS(&m_queryHeap)));
    }
}

void D3D12Sample::RunCompute()
{
    double flops = 2 * m_M * m_N * m_K;
    double total = 0.0;
	double clockTime = 0.0;
	double gpuTime = 0.0;
	/*
	m_d3d12Device->SetStablePowerState(true);
	while (true) {

	}*/
	// const double TIME_UNIT = 1000000.0; // us, 1000us = 1ms. To align with Chrome tracing.
	const double TIME_UNIT = 1000.0; // ms, 1000us = 1ms. To better compare.
    for (int it = 0; it < m_computeCount; it++)
    {
        // This will restart the command list and start a new record.
        ThrowIfFailed(m_computeAllocator->Reset());
        ThrowIfFailed(m_commandList->Reset(m_computeAllocator.Get(), m_computePSO.Get()));

        // Record commands.
        // Get a timestamp at the beginning and end of the command list.
        const UINT timestampHeapIndex = 2 * it;
        m_commandList->EndQuery(m_queryHeap.Get(), D3D12_QUERY_TYPE_TIMESTAMP, timestampHeapIndex);
        ID3D12DescriptorHeap* pHeaps[] = { m_cbSrvHeap.Get() };
        m_commandList->SetDescriptorHeaps(_countof(pHeaps), pHeaps);

        m_commandList->SetComputeRootSignature(m_computeRootSignature.Get());
        CD3DX12_GPU_DESCRIPTOR_HANDLE gpuSrvDescriptorHandle(m_cbSrvHeap->GetGPUDescriptorHandleForHeapStart());
        m_commandList->SetComputeRootDescriptorTable(0, gpuSrvDescriptorHandle);
        gpuSrvDescriptorHandle.Offset(1, m_cbSrvDescriptorSize);
        m_commandList->SetComputeRootDescriptorTable(1, gpuSrvDescriptorHandle);
        gpuSrvDescriptorHandle.Offset(2, m_cbSrvDescriptorSize);
        m_commandList->SetComputeRootDescriptorTable(2, gpuSrvDescriptorHandle);

        m_commandList->SetPipelineState(m_computePSO.Get());
        m_commandList->Dispatch(mDispatchX, mDispatchY, 1);
        m_commandList->EndQuery(m_queryHeap.Get(), D3D12_QUERY_TYPE_TIMESTAMP, timestampHeapIndex + 1);
        m_commandList->ResolveQueryData(m_queryHeap.Get(), D3D12_QUERY_TYPE_TIMESTAMP, timestampHeapIndex, 2, m_queryResult.Get(), timestampHeapIndex * sizeof(UINT64));

        ThrowIfFailed(m_commandList->Close());
        auto start = std::chrono::steady_clock::now();
        // Execute the command list.
        ID3D12CommandList* ppCommandLists[] = { m_commandList.Get() };
        UINT64 gpuTimestampBegin, gpuTimestampEnd;
        UINT64 cpuTimestampBegin, cpuTimestampEnd;
        m_commandQueue->GetClockCalibration(&gpuTimestampBegin, &cpuTimestampBegin);
        m_commandQueue->ExecuteCommandLists(_countof(ppCommandLists), ppCommandLists);
        WaitForGpu();

        m_commandQueue->GetClockCalibration(&gpuTimestampEnd, &cpuTimestampEnd);
		if (it == 4)
		{
			// mTimestampPeriod = static_cast<float>(1e9) / frequency;
			const double gpuAdjust = double(TIME_UNIT) / double(m_timestampFrequency);
			const double cpuAdjust = double(TIME_UNIT) / double(m_cputimestampFrequency);
			// printf("\n cpuAdjust= %f, gpuAdjust=%f\n", cpuAdjust, gpuAdjust);
			// printf("\noriginal CPU: %lld,%lld,%f\n", cpuTimestampBegin, cpuTimestampEnd, double((cpuTimestampEnd - cpuTimestampBegin)));
			// printf("\noriginal GPU: %lld,%lld,%f\n", gpuTimestampBegin, gpuTimestampEnd, double((gpuTimestampEnd - gpuTimestampBegin)));\
			// printf("\nttt CPU: %lld,%lld,%f\n", double(cpuTimestampBegin)/ double(m_cputimestampFrequency)

			clockTime = double(gpuTimestampBegin)*double(TIME_UNIT) / double(m_timestampFrequency);
			// printf("\nCPU: %f,%f,%f\n", double(cpuTimestampBegin)*double(TIME_UNIT) / double(m_cputimestampFrequency), cpuTimestampEnd *double(TIME_UNIT) / double(m_cputimestampFrequency), double((cpuTimestampEnd - cpuTimestampBegin))* double(TIME_UNIT) / double(m_cputimestampFrequency));
			// printf("\nGPU: %f,%f,%f\n", double(gpuTimestampBegin)*double(TIME_UNIT) / double(m_timestampFrequency), gpuTimestampEnd*double(TIME_UNIT) / double(m_timestampFrequency), double((gpuTimestampEnd - gpuTimestampBegin))* double(TIME_UNIT) / double(m_timestampFrequency));
		}
		/*
		m_commandQueue->GetClockCalibration(&gpuTimestampBegin, &cpuTimestampBegin);
		// Sleep 1s = 1000 ms.
		Sleep(1000);
		m_commandQueue->GetClockCalibration(&gpuTimestampEnd, &cpuTimestampEnd);
		{
			const double gpuAdjust = double(TIME_UNIT) / double(m_timestampFrequency);
			const double cpuAdjust = double(TIME_UNIT) / double(m_cputimestampFrequency);
			printf("\nsleep CPU: %lld,%lld,%f\n", cpuTimestampBegin*cpuAdjust, cpuTimestampEnd*cpuAdjust, double((cpuTimestampEnd - cpuTimestampBegin))* cpuAdjust);
			printf("\nsleep GPU: %lld,%lld,%f\n", gpuTimestampBegin*gpuAdjust, gpuTimestampEnd*gpuAdjust, double((gpuTimestampEnd - gpuTimestampBegin))* gpuAdjust);
		}
		*/
        auto end = std::chrono::steady_clock::now();
        auto diff = end - start;
        if (it > 0)
        {
            total += std::chrono::duration_cast<std::chrono::microseconds>(diff).count();
        }
    }

    double avg_time = total / (m_computeCount - 1);
    double total_kernel = 0;
    double minTime = 1e100;

    // Get the timestamp values from the result buffers.
    D3D12_RANGE readRange = {};
    const D3D12_RANGE emptyRange = {};
    // printf("\n1000000/ m_timestampFrequency =%f\n", float(TIME_UNIT) / float(m_timestampFrequency));
    for (UINT i = 0; i < m_computeCount; i++)
    {
        readRange.Begin = (2 * i) * sizeof(UINT64);
        readRange.End = readRange.Begin + 2 * sizeof(UINT64);

        void* pData = nullptr;
        ThrowIfFailed(m_queryResult->Map(0, &readRange, &pData));

        const UINT64* pTimestamps = reinterpret_cast<UINT64*>(static_cast<UINT8*>(pData) + readRange.Begin);
        const UINT64 timeStampDelta = pTimestamps[1] - pTimestamps[0];


        // Unmap with an empty range (written range).
        m_queryResult->Unmap(0, &emptyRange);

        // Calculate the GPU execution time in microseconds.
        // us? 
		// 12000048
        const UINT64 gpuTimeUS =  (timeStampDelta * TIME_UNIT) / m_timestampFrequency;
		if (i == 4)
			gpuTime = double(pTimestamps[0])* TIME_UNIT / double(m_timestampFrequency);
			/*
        printf("\n GPU timestamp: %f, %f, %f\n", double(pTimestamps[0])* TIME_UNIT / double(m_timestampFrequency),
			double(pTimestamps[1])*TIME_UNIT / double(m_timestampFrequency), (double(timeStampDelta * TIME_UNIT) / double(m_timestampFrequency)));
			*/
        // Don't consider the first dispatch time.
        if (i > 0)
        {
            if (gpuTimeUS < minTime)
                minTime = gpuTimeUS;
            total_kernel += gpuTimeUS;
        }
    }

	printf("\nclockTime = %f, gpuTime= %f, diff = %f\n", clockTime, gpuTime, (gpuTime - clockTime));
    double avg_kernel = 0;
    avg_kernel = total_kernel / (m_computeCount - 1);
	/*
    printf("Avg_time = %f us, Avg_kernel_time = %f us, min_time = %f us\n",
           avg_time, avg_kernel, minTime);
  */

    m_computeAllocator->Reset();
    m_commandList->Reset(m_computeAllocator.Get(), m_computePSO.Get());

#ifdef PRINT_DATA
    // Read data back to verify the result
    UINT64 outputBufferSize = m_M * m_N * sizeof(float);
    ComPtr<ID3D12Resource> readbackBuffer;
    ThrowIfFailed(m_d3d12Device->CreateCommittedResource(
        &CD3DX12_HEAP_PROPERTIES(D3D12_HEAP_TYPE_READBACK),
        D3D12_HEAP_FLAG_NONE,
        &CD3DX12_RESOURCE_DESC::Buffer(outputBufferSize),
        D3D12_RESOURCE_STATE_COPY_DEST,
        nullptr,
        IID_PPV_ARGS(&readbackBuffer)));
    readbackBuffer->SetName(L"Readback buffer Map");
    if (mStorageType == STORAGETYPE::TEXTURE)
    {
        ResourceBarrier(m_commandList.Get(), mTextureResult.Get(), D3D12_RESOURCE_STATE_UNORDERED_ACCESS, D3D12_RESOURCE_STATE_COPY_SOURCE);
        D3D12_TEXTURE_COPY_LOCATION copyDest;
        copyDest.pResource = readbackBuffer.Get();
        copyDest.Type = D3D12_TEXTURE_COPY_TYPE_PLACED_FOOTPRINT;
        UINT64 transferToToalBytes;
        const UINT64 baseOffset = 0;
        D3D12_RESOURCE_DESC desc = mTextureResult.Get()->GetDesc();
        m_d3d12Device->GetCopyableFootprints(&desc, 0, 1, baseOffset, &copyDest.PlacedFootprint, nullptr, nullptr, &transferToToalBytes);

        D3D12_TEXTURE_COPY_LOCATION copySrc;
        copySrc.pResource = mTextureResult.Get();
        copySrc.Type = D3D12_TEXTURE_COPY_TYPE_SUBRESOURCE_INDEX;
        copySrc.SubresourceIndex = 0;
        CD3DX12_BOX box(0, 0, m_N / m_componentSize, m_M);
        m_commandList->CopyTextureRegion(&copyDest, 0, 0, 0, &copySrc, &box);
    }
    else
    {
        ResourceBarrier(m_commandList.Get(), m_bufferResult.Get(), D3D12_RESOURCE_STATE_UNORDERED_ACCESS, D3D12_RESOURCE_STATE_COPY_SOURCE);
        m_commandList->CopyResource(readbackBuffer.Get(), m_bufferResult.Get());
    }

    m_commandList->Close();
    ID3D12CommandList* ppCommandLists[] = { m_commandList.Get() };
    m_commandQueue->ExecuteCommandLists(_countof(ppCommandLists), ppCommandLists);
    WaitForGpu();

    float result = 0.0;
    int m = rand() % m_M;
    int n = rand() % m_N;
    D3D12_RANGE readbackBufferRange{ 0, outputBufferSize };
    FLOAT * pReadbackBufferData{};
    ThrowIfFailed(readbackBuffer->Map(
        0,
        &readbackBufferRange,
        reinterpret_cast<void**>(&pReadbackBufferData)));

    result = pReadbackBufferData[m*m_N + n];
    readbackBuffer->Unmap(0, &emptyRange);

    float acc = 0.0;
    for (unsigned int k = 0; k < m_K; k++)
    {
        acc += buf1Data[m*m_K + k] * buf2Data[k*m_N + n];
    }
    // printf("The result is GPU: %f, CPU: %f\n", result, acc);
#endif // PRINT_DATA
}

// Wait for pending GPU work to complete.
void D3D12Sample::WaitForGpu()
{
    // Schedule a Signal command in the queue.
    ThrowIfFailed(m_commandQueue->Signal(m_computeFence.Get(), m_computeFenceValue));

    // Wait until the fence has been processed.
    ThrowIfFailed(m_computeFence->SetEventOnCompletion(m_computeFenceValue, m_computeFenceEvent));
    WaitForSingleObjectEx(m_computeFenceEvent, INFINITE, FALSE);

    // Increment the fence value for the current frame.
    m_computeFenceValue++;
}
